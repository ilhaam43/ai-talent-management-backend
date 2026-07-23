import { PrismaClient, StorageType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set in environment.');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.MINIO_INTERNAL_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  },
  forcePathStyle: true,
});

const documentsBucket = process.env.MINIO_BUCKET_NAME || 'ai-talent-documents';
const avatarsBucket = process.env.MINIO_AVATARS_BUCKET || 'ai-talent-avatars';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fileExists(p: string): Promise<boolean> {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

async function uploadToMinIO(bucket: string, key: string, localPath: string, contentType: string): Promise<boolean> {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      })
    );
    return true;
  } catch (err: any) {
    console.error(`❌ Failed to upload ${localPath} to ${bucket}/${key}: ${err.message}`);
    return false;
  }
}

function sanitizeExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return `.${parts[parts.length - 1].toLowerCase()}`;
}

async function migrate() {
  console.log('🏁 Starting MinIO File Migration Script...');
  console.log(`📡 S3 Endpoint: ${process.env.MINIO_INTERNAL_ENDPOINT || 'http://localhost:9000'}`);
  console.log(`📦 Buckets — Documents: ${documentsBucket}, Avatars: ${avatarsBucket}`);

  let documentSuccess = 0;
  let documentFailed = 0;
  let documentSkipped = 0;

  // 1. Migrate CandidateDocument
  const documents = await prisma.candidateDocument.findMany({
    where: { storageType: StorageType.LOCAL },
    include: { documentType: true },
  });

  console.log(`\n📋 Found ${documents.length} CandidateDocument records on LOCAL storage...`);

  for (const doc of documents) {
    if (!doc.filePath) {
      documentSkipped++;
      continue;
    }

    const localPath = path.resolve(doc.filePath);
    if (!await fileExists(localPath)) {
      console.warn(`⚠️  Local file does not exist: ${localPath}`);
      documentFailed++;
      continue;
    }

    // Determine folder structure from docType
    const docTypeName = doc.documentType?.documentType || 'other';
    const folderMap: Record<string, string> = {
      'CV/Resume': 'cv',
      'Cover Letter': 'cover-letters',
      'Certificate': 'certificates',
      'Ijazah': 'ijazah',
      'KTP': 'ktp',
      'Academic Transcript': 'transcript',
    };
    const folder = folderMap[docTypeName] || 'other';
    
    // Build S3 key
    const originalName = path.basename(localPath);
    const ext = sanitizeExtension(originalName);
    const objectKey = `${folder}/${doc.candidateId}/${randomUUID()}${ext}`;
    
    // Enforce contentType
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    console.log(`🔹 Migrating: ${originalName} -> S3: ${objectKey}`);
    const success = await uploadToMinIO(documentsBucket, objectKey, localPath, contentType);

    if (success) {
      const stats = fs.statSync(localPath);
      await prisma.candidateDocument.update({
        where: { id: doc.id },
        data: {
          storageType: StorageType.MINIO,
          objectKey,
          bucket: documentsBucket,
          mimeType: contentType,
          sizeBytes: stats.size,
          originalName,
          uploadStatus: 'CONFIRMED',
        },
      });
      documentSuccess++;
    } else {
      documentFailed++;
    }
  }

  console.log(`\n✅ CandidateDocument Migration Finished: ${documentSuccess} success, ${documentFailed} failed, ${documentSkipped} skipped.`);

  // 2. Migrate Avatars / Profile Photos
  let avatarSuccess = 0;
  let avatarFailed = 0;

  const candidatesWithAvatars = await prisma.candidate.findMany({
    where: {
      profilePhotoUrl: {
        startsWith: 'uploads/documents/photos/',
      },
    },
  });

  console.log(`\n👤 Found ${candidatesWithAvatars.length} Candidate profile photos on LOCAL storage...`);

  for (const cand of candidatesWithAvatars) {
    if (!cand.profilePhotoUrl) continue;
    const localPath = path.resolve(cand.profilePhotoUrl);

    if (!await fileExists(localPath)) {
      console.warn(`⚠️  Avatar file does not exist: ${localPath}`);
      avatarFailed++;
      continue;
    }

    const filename = path.basename(localPath);
    const ext = sanitizeExtension(filename);
    const key = `${cand.id}${ext}`;
    
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = mimeMap[ext] || 'image/webp';

    console.log(`🔹 Migrating Avatar: ${filename} -> S3: ${key}`);
    const success = await uploadToMinIO(avatarsBucket, key, localPath, contentType);

    if (success) {
      // Build public URL
      const extHost = process.env.MINIO_EXTERNAL_ENDPOINT || 'http://localhost:9000';
      const publicUrl = `${extHost}/${avatarsBucket}/${key}`;
      
      await prisma.candidate.update({
        where: { id: cand.id },
        data: { profilePhotoUrl: publicUrl },
      });
      avatarSuccess++;
    } else {
      avatarFailed++;
    }
  }

  console.log(`✅ Avatar Migration Finished: ${avatarSuccess} success, ${avatarFailed} failed.`);

  // 3. Migrate Talent Pool Queue Items
  let tpSuccess = 0;
  let tpFailed = 0;

  const tpItems = await prisma.talentPoolQueue.findMany({
    where: {
      objectKey: null,
      fileUrl: {
        startsWith: '/uploads/talent-pool/',
      },
    },
  });

  console.log(`\n📦 Found ${tpItems.length} Talent Pool Queue items on LOCAL storage...`);

  for (const item of tpItems) {
    const localPath = path.resolve(`.${item.fileUrl}`);

    if (!await fileExists(localPath)) {
      console.warn(`⚠️  Talent pool local file does not exist: ${localPath}`);
      tpFailed++;
      continue;
    }

    const ext = sanitizeExtension(item.fileName);
    const objectKey = `talent-pool/${item.batchId}/${randomUUID()}${ext}`;

    console.log(`🔹 Migrating Talent Pool CV: ${item.fileName} -> S3: ${objectKey}`);
    const success = await uploadToMinIO(documentsBucket, objectKey, localPath, 'application/pdf');

    if (success) {
      await prisma.talentPoolQueue.update({
        where: { id: item.id },
        data: { objectKey },
      });
      tpSuccess++;
    } else {
      tpFailed++;
    }
  }

  console.log(`✅ Talent Pool Queue Migration Finished: ${tpSuccess} success, ${tpFailed} failed.`);

  // 4. Migrate Talent Pool Candidates CV URLs
  let tpcSuccess = 0;
  let tpcFailed = 0;

  const tpcCandidates = await prisma.candidate.findMany({
    where: {
      cvStorageType: StorageType.LOCAL,
      cvFileUrl: {
        startsWith: '/uploads/talent-pool/',
      },
    },
  });

  console.log(`\n👥 Found ${tpcCandidates.length} Talent Pool Candidates CV files on LOCAL storage...`);

  for (const c of tpcCandidates) {
    if (!c.cvFileUrl) continue;
    const localPath = path.resolve(`.${c.cvFileUrl}`);

    if (!await fileExists(localPath)) {
      console.warn(`⚠️  Talent Pool Candidate CV file does not exist: ${localPath}`);
      tpcFailed++;
      continue;
    }

    const ext = sanitizeExtension(c.cvFileName || 'cv.pdf');
    const objectKey = `talent-pool/${c.talentPoolBatchId || 'anonymous'}/${randomUUID()}${ext}`;

    console.log(`🔹 Migrating Candidate CV: ${c.cvFileName} -> S3: ${objectKey}`);
    const success = await uploadToMinIO(documentsBucket, objectKey, localPath, 'application/pdf');

    if (success) {
      await prisma.candidate.update({
        where: { id: c.id },
        data: {
          cvFileUrl: objectKey,
          cvStorageType: StorageType.MINIO,
        },
      });
      tpcSuccess++;
    } else {
      tpcFailed++;
    }
  }

  console.log(`✅ Talent Pool Candidate CV Migration Finished: ${tpcSuccess} success, ${tpcFailed} failed.`);
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

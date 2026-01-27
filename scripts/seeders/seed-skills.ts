import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const skills = [
    // Network & Infrastructure
    'OSPF', 'BGP', 'VLANs', 'STP', 'Wireshark', 'Nmap', 'GNS3', 'Puppet', 'Ansible',
    'MPLS', 'SD-WAN', 'QoS', 'Network Security', 'Firewalls', 'VPN', 'Cisco DNA', 'Riverbed', 'Splunk',

    // Cybersecurity
    'Vulnerability Assessment', 'Incident Response', 'Nessus', 'Metasploit', 'Antivirus Management',
    'Threat Hunting', 'Forensics', 'Penetration Testing', 'QRadar', 'EnCase', 'Burp Suite', 'Kali Linux', 'Zero Trust',

    // Cloud & DevOps
    'AWS', 'GCP', 'Docker', 'Bash', 'Python', 'Terraform', 'Jenkins', 'GitLab CI', 'Prometheus', 'Grafana',
    'Kubernetes', 'Helm', 'Istio', 'Serverless', 'Lambda', 'Go', 'Rust', 'Microservices', 'ArgoCD', 'ELK Stack',

    // Frontend
    'React.js', 'TypeScript', 'CSS3', 'SASS', 'Webpack', 'Redux', 'Zustand', 'Jest', 'React Testing Library', 'Figma',
    'Next.js', 'Web Performance', 'Micro-frontends', 'PWA', 'WebSockets', 'CI/CD', 'Lighthouse', 'Vercel', 'Netlify', 'Cypress',

    // Business & Strategy
    'Market Research', 'Financial Basics', 'SWOT Analysis', 'Excel', 'Pivot Tables', 'PowerPoint', 'Google Analytics',
    'Corporate Strategy', 'M&A', 'Financial Modeling', 'Strategic Planning', 'Stakeholder Management', 'Tableau', 'PowerBI', 'SPSS', 'SAS',
    'Corporate Communications', 'Event Management', 'Microsoft Office', 'Zoom', 'Teams', 'Trello', 'Asana',
    'Investor Relations', 'Crisis Management', 'Strategic Advisory', 'Bloomberg Terminal', 'Bloomberg', 'Presentation Skills',

    // Finance
    'GL Reconciliation', 'Budgeting', 'Tax Regulation', 'Brevet A/B', 'SAP', 'Oracle', 'Excel Macros',
    'FP&A', 'Treasury', 'Audit', 'SAP S/4HANA', 'Hyperion',

    // HR
    'Recruitment', 'Administration', 'Labor Law', 'LinkedIn Recruiter', 'JobStreet', 'HRIS', 'Talent', 'Workday',
    'Talent Management', 'OD', 'Compensation & Benefits', 'Industrial Relations', 'SuccessFactors', 'Mercer', 'DISC', 'MBTI',

    // QA & Testing
    'Apache JMeter', 'Postman', 'Selenium', 'NeoLoad', 'IBM Rational Performance Tester', 'Performance Testing', 'Test Plans', 'Test Cases', 'DR Testing',

    // IT Support & Infrastructure
    'Microsoft Active Directory', 'Office 365', 'Microsoft Excel', 'Storage Area Networks', 'SAN', 'WAN Acceleration', 'Virtualization', 'Routers', 'Backup Applications', 'IT Asset Management', 'IT Service Management', 'ITSM', 'ITIL Foundation', 'LAN Cabling',

    // Sales & Account Management
    'Account Management', 'Client Relationship Management', 'Contract Negotiation', 'Solution Selling', 'Customer Success', 'Project Coordination', 'Sales Strategy', 'Presentation Skills'
];

async function main() {
    console.log('Seeding skills...\n');
    let createdCount = 0;

    for (const skillName of skills) {
        await prisma.skill.upsert({
            where: { skillName },
            update: {},
            create: { skillName }
        });
        createdCount++;
    }

    console.log(`\n✅ Skills seeded successfully! Processed ${createdCount} skills.`);
}

main()
    .catch((error) => {
        console.error('Error seeding skills:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

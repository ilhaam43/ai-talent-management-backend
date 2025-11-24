const fs = require('fs')
const path = require('path')

function pascalCase(str) {
  return String(str)
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase())
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function writeFile(p, content) {
  if (fs.existsSync(p)) return
  fs.writeFileSync(p, content)
}

function addModuleToAppModule(moduleName, moduleImportPath) {
  const appModulePath = path.join('src', 'app.module.ts')
  const content = fs.readFileSync(appModulePath, 'utf8')
  const importLine = `import { ${moduleName} } from '${moduleImportPath}'\n`
  if (!content.includes(importLine)) {
    const updated = importLine + content
    const withModule = updated.replace(/imports:\s*\[(.*?)\]/s, (m, g1) => {
      const items = g1.trim() ? g1.trim() + `, ${moduleName}` : moduleName
      return `imports: [${items}]`
    })
    fs.writeFileSync(appModulePath, withModule)
  }
}

function main() {
  const nameArg = process.argv[2]
  if (!nameArg) {
    console.error('Usage: node scripts/generate-module.js <name>')
    process.exit(1)
  }
  const name = nameArg.toLowerCase()
  const Name = pascalCase(name)
  const dir = path.join('src', name)
  ensureDir(dir)

  writeFile(
    path.join(dir, `${name}.entity.ts`),
    `export class ${Name} {\n  constructor(public id: string, public title: string, public description: string) {}\n}\n`
  )

  writeFile(
    path.join(dir, `${name}.repository.ts`),
    `import { Injectable } from '@nestjs/common'\nimport { DatabaseService } from '../database/database.service'\nimport { ${Name} } from './${name}.entity'\n\n@Injectable()\nexport class ${Name}Repository {\n  private table = '${name}'\n  constructor(private readonly db: DatabaseService) {}\n  async findById(id: string) {\n    const row = this.db.findById(this.table, id)\n    if (!row) return null\n    return new ${Name}(id, String(row.title), String(row.description))\n  }\n  async findAll() {\n    const rows = this.db.findAll(this.table)\n    return rows.map(r => new ${Name}(String(r.id), String(r.title), String(r.description)))\n  }\n  async create(data: { id: string; title: string; description: string }) {\n    this.db.insert(this.table, data.id, data)\n    return new ${Name}(data.id, data.title, data.description)\n  }\n}\n`
  )

  writeFile(
    path.join(dir, `${name}.service.ts`),
    `import { Injectable, NotFoundException } from '@nestjs/common'\nimport { ${Name}Repository } from './${name}.repository'\n\n@Injectable()\nexport class ${Name}Service {\n  constructor(private readonly repo: ${Name}Repository) {}\n  async getById(id: string) {\n    const item = await this.repo.findById(id)\n    if (!item) throw new NotFoundException('${Name} not found')\n    return item\n  }\n  async list() {\n    return this.repo.findAll()\n  }\n  async create(data: { id: string; title: string; description: string }) {\n    return this.repo.create(data)\n  }\n}\n`
  )

  writeFile(
    path.join(dir, `${name}.controller.ts`),
    `import { Controller, Get, Param, Post, Body } from '@nestjs/common'\nimport { ${Name}Service } from './${name}.service'\n\n@Controller('${name}')\nexport class ${Name}Controller {\n  constructor(private readonly service: ${Name}Service) {}\n  @Get(':id')\n  getById(@Param('id') id: string) {\n    return this.service.getById(id)\n  }\n  @Get()\n  list() {\n    return this.service.list()\n  }\n  @Post()\n  create(@Body() body: { id: string; title: string; description: string }) {\n    return this.service.create(body)\n  }\n}\n`
  )

  writeFile(
    path.join(dir, `${name}.module.ts`),
    `import { Module } from '@nestjs/common'\nimport { ${Name}Controller } from './${name}.controller'\nimport { ${Name}Service } from './${name}.service'\nimport { ${Name}Repository } from './${name}.repository'\nimport { DatabaseModule } from '../database/database.module'\n\n@Module({\n  imports: [DatabaseModule],\n  controllers: [${Name}Controller],\n  providers: [${Name}Service, ${Name}Repository]\n})\nexport class ${Name}Module {}\n`
  )

  addModuleToAppModule(`${Name}Module`, `./${name}/${name}.module`)
  console.log(`Module '${name}' generated.`)
}

main()
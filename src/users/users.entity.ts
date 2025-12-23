export class User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public emailVerified: Date | null,
    public password: string,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}

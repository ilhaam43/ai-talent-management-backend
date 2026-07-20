import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        console.log('[DEBUG RolesGuard] User from request:', user);
        console.log('[DEBUG RolesGuard] Required roles:', requiredRoles);

        if (!user || !user.role) {
            console.log('[DEBUG RolesGuard] Denying access: user or user.role is missing');
            return false;
        }

        const isAllowed = requiredRoles.some((role) => user.role === role);
        console.log('[DEBUG RolesGuard] Access allowed:', isAllowed);
        return isAllowed;
    }
}

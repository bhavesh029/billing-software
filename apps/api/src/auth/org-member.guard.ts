import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from './jwt-auth.guard';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & { user?: JwtUser; organizationId?: string }
    >();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException();
    }
    const rawOrgId = req.params['orgId'];
    const orgId = Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId;
    if (!orgId) {
      throw new ForbiddenException('Missing organization');
    }
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: user.sub },
    });
    if (!member) {
      throw new ForbiddenException('Not a member of this organization');
    }
    req.organizationId = orgId;
    return true;
  }
}

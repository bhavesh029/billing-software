import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OrgMemberGuard } from './org-member.guard';

@Module({
  providers: [JwtAuthGuard, OrgMemberGuard],
  exports: [JwtAuthGuard, OrgMemberGuard],
})
export class AuthModule {}

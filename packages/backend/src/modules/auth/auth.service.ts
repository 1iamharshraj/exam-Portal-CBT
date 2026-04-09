import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { LoginDto } from './dto/login.dto';
import { TOKEN_EXPIRY } from '@exam-portal/shared';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.usersService.findByEmail(loginDto.email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken, userAgent, ipAddress);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenModel.findOne({
      userId,
      tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token (rotation)
    storedToken.isRevoked = true;
    await storedToken.save();

    const user = await this.usersService.findById(userId);
    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(
      userId,
      tokens.refreshToken,
      storedToken.userAgent,
      storedToken.ipAddress,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.refreshTokenModel.updateOne(
        { userId, tokenHash },
        { isRevoked: true },
      );
    }
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return { message: 'If an account exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET);

    await this.usersService.setResetToken(user._id.toString(), hashedToken, expires);

    // In Sprint 1, log to console instead of sending email
    console.log('========================================');
    console.log('PASSWORD RESET TOKEN (dev only)');
    console.log(`Email: ${email}`);
    console.log(`Token: ${resetToken}`);
    console.log(`Expires: ${expires.toISOString()}`);
    console.log('========================================');

    return { message: 'If an account exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(user._id.toString(), passwordHash);

    // Revoke all refresh tokens for this user
    await this.refreshTokenModel.updateMany(
      { userId: user._id },
      { isRevoked: true },
    );

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findById(userId)).email,
      true,
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, passwordHash);

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret')!,
        expiresIn: this.configService.get<string>('jwt.accessExpiry') as any,
      }),
      this.jwtService.signAsync(
        { sub: user._id.toString() },
        {
          secret: this.configService.get<string>('jwt.refreshSecret')!,
          expiresIn: this.configService.get<string>('jwt.refreshExpiry') as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: UserDocument) {
    const { passwordHash: _, passwordResetToken: _t, passwordResetExpires: _e, ...rest } = user.toObject();
    return rest;
  }
}

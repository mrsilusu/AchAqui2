import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { UpdateOwnerSettingsDto } from './dto/update-owner-settings.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('signin')
  @Public()
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post('refresh')
  @Public()
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @Public()
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto);
  }

  @Get('me')
  me(@Req() req: { user: { userId: string } }) {
    return this.authService.me(req.user.userId);
  }

  @Patch('settings')
  updateSettings(
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateOwnerSettingsDto,
  ) {
    return this.authService.updateSettings(req.user.userId, body);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: { user: { userId: string } },
    @Body() body: { name: string },
  ) {
    return this.authService.updateProfile(req.user.userId, body);
  }

  @Post('forgot-password')
  @Public()
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email ?? '');
  }
}

import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleSignInDto } from './dto/google-sign-in.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<Record<string, unknown>> {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<Record<string, unknown>> {
    return this.authService.login(dto);
  }

  @Post('google')
  signInWithGoogle(@Body() dto: GoogleSignInDto): Promise<Record<string, unknown>> {
    return this.authService.signInWithGoogle(dto);
  }

  @Post('guest')
  signInAsGuest(): Promise<Record<string, unknown>> {
    return this.authService.signInAsGuest();
  }
}
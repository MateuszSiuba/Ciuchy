import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { GoogleSignInDto } from './dto/google-sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  signInWithGoogle(@Body() dto: GoogleSignInDto): Promise<Record<string, unknown>> {
    return this.authService.signInWithGoogle(dto);
  }

  @Post('guest')
  signInAsGuest(): Promise<Record<string, unknown>> {
    return this.authService.signInAsGuest();
  }
}
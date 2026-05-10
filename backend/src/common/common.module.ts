import { Module, Global } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { WalletService } from './services/wallet.service';
import { StorageService } from './services/storage.service';

@Global()
@Module({
  providers: [MailService, WalletService, StorageService],
  exports: [MailService, WalletService, StorageService],
})
export class CommonModule {}

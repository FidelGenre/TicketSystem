import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('special_code_payouts')
export class SpecialCodePayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ownerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', nullable: true, length: 300 })
  note: string | null;

  @CreateDateColumn()
  paidAt: Date;
}

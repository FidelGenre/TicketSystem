import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { User } from './user.entity';

@Entity('special_codes')
export class SpecialCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 40 })
  code: string;

  @Column('uuid')
  ownerUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;

  @Column({ type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'eventId' })
  event: Event | null;

  @Column({ default: true })
  isActive: boolean;

  /** Fixed commission in the event's currency paid to the owner per ticket sold */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commissionFixed: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

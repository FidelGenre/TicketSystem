import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { SocialMatchConnection } from './social-match-connection.entity';

@Entity('social_match_messages')
export class SocialMatchMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  connectionId: string;

  @Column()
  senderId: string;

  @ManyToOne(() => SocialMatchConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connectionId' })
  connection: SocialMatchConnection;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'varchar', length: 1000 })
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}

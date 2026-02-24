import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMusicSupport1771259394200 implements MigrationInterface {
  name = 'AddMusicSupport1771259394200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "mbId" varchar`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_media_mbId" ON "media" ("mbId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_media_mbId"`);
    await queryRunner.query(
      `ALTER TABLE "media" DROP COLUMN "mbId"`
    );
  }
}

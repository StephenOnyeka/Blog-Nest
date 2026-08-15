import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationsAndSubscriptions1786785518042 implements MigrationInterface {
    name = 'AddNotificationsAndSubscriptions1786785518042'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" integer NOT NULL, "type" character varying NOT NULL, "message" text NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "article_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ffd14df0a11028f62d799bb8ff0" UNIQUE ("public_id"), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" SERIAL NOT NULL, "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "topics" text array NOT NULL DEFAULT '{}', "newsletter" boolean NOT NULL DEFAULT true, "verified" boolean NOT NULL DEFAULT false, "token" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_62f3489de40c61683940cfc31b6" UNIQUE ("public_id"), CONSTRAINT "UQ_f0558bf43d14f66844255e8b7c2" UNIQUE ("email"), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_dbdbc172849d843aefcfe94db7c" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_dbdbc172849d843aefcfe94db7c"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }

}

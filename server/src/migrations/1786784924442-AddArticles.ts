import { MigrationInterface, QueryRunner } from "typeorm";

export class AddArticles1786784924442 implements MigrationInterface {
    name = 'AddArticles1786784924442'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_6515da4dff8db423ce4eb841490"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "public_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "UQ_bfb896e9d6251591d410b671ecf" UNIQUE ("public_id")`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "title" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "subtitle"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "subtitle" text`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "thumbnail"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "thumbnail" character varying`);
        await queryRunner.query(`ALTER TABLE "articles" ALTER COLUMN "read_time" SET DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "articles" ALTER COLUMN "is_draft" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "published_at"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "published_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "author_id"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "author_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_6515da4dff8db423ce4eb841490" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_6515da4dff8db423ce4eb841490"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "author_id"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "author_id" uuid`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "published_at"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "published_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "articles" ALTER COLUMN "is_draft" SET DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "articles" ALTER COLUMN "read_time" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "thumbnail"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "thumbnail" text`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "subtitle"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "subtitle" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "title" character varying(300) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "UQ_bfb896e9d6251591d410b671ecf"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "public_id"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_6515da4dff8db423ce4eb841490" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArticles1786784924442 implements MigrationInterface {
  name = 'AddArticles1786784924442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old articles table with CASCADE to also remove any FKs that depend on it
    // (e.g. notifications.article_id FK that pointed to the old UUID-keyed articles table)
    await queryRunner.query(`DROP TABLE IF EXISTS "articles" CASCADE`);

    // Drop old notifications / subscriptions tables that were part of the old Supabase schema
    // so they can be recreated cleanly when those modules are implemented
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions" CASCADE`);

    // Create the new articles table with SERIAL PK + UUID public_id
    await queryRunner.query(`
            CREATE TABLE "articles" (
                "id" SERIAL NOT NULL,
                "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying NOT NULL,
                "subtitle" text,
                "body" text NOT NULL,
                "thumbnail" character varying,
                "tags" text[] NOT NULL DEFAULT '{}',
                "read_time" integer NOT NULL DEFAULT '5',
                "is_member_only" boolean NOT NULL DEFAULT false,
                "is_draft" boolean NOT NULL DEFAULT false,
                "published_at" TIMESTAMP WITH TIME ZONE,
                "claps" integer NOT NULL DEFAULT '0',
                "comments_count" integer NOT NULL DEFAULT '0',
                "author_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_bfb896e9d6251591d410b671ecf" UNIQUE ("public_id"),
                CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id")
            )
        `);

    // Add FK from articles.author_id -> profiles.id
    await queryRunner.query(`
            ALTER TABLE "articles"
            ADD CONSTRAINT "FK_6515da4dff8db423ce4eb841490"
            FOREIGN KEY ("author_id") REFERENCES "profiles"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT "FK_6515da4dff8db423ce4eb841490"`,
    );
    await queryRunner.query(`DROP TABLE "articles"`);
  }
}

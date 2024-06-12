import postgres from 'postgres'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

const db = postgres({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: 5432,
  ssl: 'require',
  connection: {
    options: `project=${process.env.ENDPOINT_ID}`
  }
})

cloudinary.config({
  cloud_name: 'dw43hgf5p',
  api_key: '931953722983393',
  api_secret: process.env.API_SECRET // Click 'View Credentials' below to copy your API secret
})

export class StarModelPostgres {
  static async getArticles ({ search, topic }) {
    if (search) {
      const articles = await db`SELECT * FROM articles WHERE LOWER(article_title) LIKE '%' || ${search} || '%' LIMIT 15;`

      return articles
    }
    if (topic) {
      const genreLower = topic.toLowerCase()
      const articles = await db`SELECT * FROM articles WHERE genre = ${genreLower} limit 15;`

      return articles
    }
    const articles = await db`SELECT * FROM articles limit 15;`

    return articles
  }

  // Gets an user for the auth method
  static async getUser ({ username }) {
    console.log(username)
    try {
      const [result] = await db`
      SELECT id, name, username, user_password FROM users WHERE username = ${username};
      `
      const user = {
        ...result
      }
      return user
    } catch (error) {
      throw new Error(error)
    }
  }

  // Gets all the article info using the id
  static async getArticleById ({ id }) {
    try {
      // Get the main article (not the referencies and the goodies)
      const article = await db`
      SELECT articles.*, articles_body.body_title, articles_body.body_content
      FROM articles
      JOIN articles_body ON articles.id = articles_body.id
      WHERE articles.id = ${id};`
      // get de references of the article
      const references = await db`select reference_text from articles_references where id = ${id};`
      // get the goodies of the articles
      const goodies = await db`select goodie_title, goodie_content from articles_goodies where id = ${id};`
      if (article.length === 0 && references.length < 3 && goodies.length < 3) return false // if everything is ok que can proceed

      const entireArticle = {
        article: article[0],
        references,
        goodies
      }
      // return the article
      return entireArticle
    } catch (error) {
      throw new Error(error)
    }
  }

  // Upload photos to the cloudinary
  static async uploadImage (image) {
    const uploadResult = await cloudinary.uploader.upload(image, {
      upload_preset: 'ml_default'
    }).catch((error) => { console.log(error) })

    if (uploadResult) {
      try {
        fs.unlinkSync(image)
      } catch (e) {
        throw new Error(e)
      }
    }

    return uploadResult.secure_url
  }

  // creates a new article
  static async createArticle (input) {
    const {
      id,
      image,
      title,
      description,
      references,
      genre,
      intro,
      conclusion,
      body,
      goodies
    } = input
    try {
      const query = await db.begin(async db => {
        await db`
          INSERT INTO articles(id, article_title, article_description, image_url, genre, intro, conclusion)
          VALUES(${id}, ${title}, ${description}, ${image}, ${genre}, ${intro}, ${conclusion})`

        for (const element of goodies) {
          await db`
            INSERT INTO articles_goodies(id, goodie_title, goodie_content)
            VALUES (${id}, ${element.goodie_title}, ${element.goodie_content})`
        }

        for (const element of references) {
          await db`
            INSERT INTO articles_references(id, reference_text)
            VALUES (${id}, ${element})`
        }

        await db`
            INSERT INTO articles_body(id, body_title, body_content)
            VALUES (${id}, ${body.title}, ${body.body})`
        // Insertar en la tabla principal

        return true
      })

      return query
    } catch (error) {
      throw new Error(error)
    }
  }

  // Deletes a new article using his id
  static async deleteArticle ({ id }) {
    try {
      const query = await db.begin(async db => {
        await db`
        DELETE FROM articles_references where id = ${id};
        `
        await db`
        DELETE FROM articles_body where id = ${id};
        `
        await db`
        DELETE FROM articles_goodies where id = ${id};
        `
        await db`
        DELETE FROM articles where id = ${id};
        `
        return true
      })
      return query
    } catch (error) {
      throw new Error(error)
    }
  }

  // Updates a new article using his id
  static async updateArticle ({ input, id }) {
    const {
      image,
      title,
      description,
      references,
      genre,
      intro,
      conclusion,
      body,
      goodies
    } = input
    try {
      const query = await db.begin(async db => {
        await db`
        DELETE FROM articles_goodies where id = ${id};
        `

        await db`
        DELETE FROM articles_references where id = ${id};
        `

        for (const element of goodies) {
          await db`
            INSERT INTO articles_goodies(id, goodie_title, goodie_content)
            VALUES (${id}, ${element.goodie_title}, ${element.goodie_content})`
        }

        for (const element of references) {
          await db`
            INSERT INTO articles_references(id, reference_text)
            VALUES (${id}, ${element})`
        }

        await db`
            UPDATE articles_body
            SET body_title = ${body.title},
            body_content = ${body.body}
            WHERE id = ${id};`

        await db`
        UPDATE articles
        SET article_title = ${title},
        article_description = ${description},
        image_url = ${image},
        genre = ${genre},
        intro = ${intro},
        conclusion = ${conclusion}
        WHERE id = ${id}
        `

        return true
      })

      return query
    } catch (error) {
      throw new Error(error)
    }
  }
}

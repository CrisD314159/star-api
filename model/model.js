import mysql from 'mysql2/promise'

const db = await mysql.createConnection(process.env.DATABASE_URL)

// Model functions
export class StarModel {
  // Gets last 15 articles without the goodies and references
  static async getArticles ({ search, topic }) {
    if (search) {
      const [articles] = await db.query('select * from articles where article_title like ? limit 15;', [`%${search}%`])

      return articles
    }
    if (topic) {
      const genreLower = topic.toLowerCase()
      const [articles] = await db.query('SELECT * FROM articles WHERE genre = ? limit 15;', [genreLower])

      return articles
    }
    const [articles] = await db.query('SELECT * FROM articles limit 15;')

    return articles
  }

  // Gets an user for the auth method
  static async getUser ({ username }) {
    try {
      const [result] = await db.query(`
      SELECT bin_to_uuid(id) as id, name, username, user_password FROM users WHERE username = ?;
      `, [username])
      const user = {
        ...result[0]

      }
      return user
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  // Gets all the article info using the id
  static async getArticleById ({ id }) {
    try {
      // Get the main article (not the referencies and the goodies)
      const [article] = await db.query(`
      SELECT articles.*, articles_body.body_title, articles_body.body_content
      FROM articles
      JOIN articles_body ON articles.id = articles_body.id
      WHERE articles.id = ?;`, [id])
      // get de references of the article
      const [references] = await db.query('select reference_text from articles_references where id = ?;', [id])
      // get the goodies of the articles
      const [goodies] = await db.query('select goodie_title, goodie_content from articles_goodies where id = ?;', [id])
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

  // creates a new article
  static async createArticle ({ input }) {
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
      await db.beginTransaction()

      for (const element of goodies) {
        await db.query(`
          INSERT INTO articles_goodies(id, goodie_title, goodie_content)
          VALUES (?, ?, ?)`, [id, element.goodie_title, element.goodie_content])
      }

      for (const element of references) {
        await db.query(`
          INSERT INTO articles_references(id, reference_text)
          VALUES (?, ?)`, [id, element])
      }

      await db.query(`
          INSERT INTO articles_body(id, body_title, body_content)
          VALUES (?, ?, ?)`, [id, body.title, body.body])
      // Insertar en la tabla principal
      await db.query(`
        INSERT INTO articles(id, article_title, article_description, image_url, genre, intro, conclusion)
        VALUES(?, ?, ?, ?, ?, ?, ?)`, [id, title, description, image, genre, intro, conclusion])

      await db.commit()

      return true
    } catch (error) {
      await db.rollback()
      throw new Error(error)
    }
  }

  // Deletes a new article using his id
  static async deleteArticle ({ id }) {
    try {
      await db.beginTransaction()
      await db.query(`
      DELETE FROM articles where id = ?;
      `, [id])
      await db.query(`
      DELETE FROM articles_references where id = ?;
      `, [id])
      await db.query(`
      DELETE FROM articles_body where id = ?;
      `, [id])
      await db.query(`
      DELETE FROM articles_goodies where id = ?;
      `, [id])
      await db.commit()
      return true
    } catch (error) {
      await db.rollback()
      throw new Error()
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
      await db.beginTransaction()

      await db.query(`
      DELETE FROM articles_goodies where id = ?;
      `, [id])

      await db.query(`
      DELETE FROM articles_references where id = ?;
      `, [id])

      for (const element of goodies) {
        await db.query(`
          INSERT INTO articles_goodies(id, goodie_title, goodie_content)
          VALUES (?, ?, ?)`, [id, element.goodie_title, element.goodie_content])
      }

      for (const element of references) {
        await db.query(`
          INSERT INTO articles_references(id, reference_text)
          VALUES (?, ?)`, [id, element])
      }

      await db.query(`
          UPDATE articles_body
          SET body_title = ?,
          body_content = ?
          WHERE id = ?;`, [body.title, body.body, id])

      await db.query(`
      UPDATE articles
      SET article_title = ?,
      article_description = ?,
      image_url = ?,
      genre = ?,
      intro = ?,
      conclusion = ?
      WHERE id = ?
      `, [title, description, image, genre, intro, conclusion, id]
      )
      await db.commit()
      return true
    } catch (error) {
      console.log(error)
      await db.rollback()
      throw new Error(error)
    }
  }
}

import { verifyArticle, verifyArticlePartial } from './zodValidation/article-schema.js'
import { randomUUID } from 'node:crypto'

export class ApiController {
  constructor ({ model }) {
    this.model = model
  }

  getArticles = async (req, res) => {
    const { search, topic } = req.query

    const articles = await this.model.getArticles({ search, topic })

    res.json(articles)
  }

  getArticleById = async (req, res) => {
    const { id } = req.params
    const article = await this.model.getArticleById({ id })
    if (!article) return res.status(404)
    res.json(article)
  }

  authUser = async (req, res) => {
    const { username } = req.params
    const user = await this.model.getUser({ username })
    if (!user) return res.status(404)
    res.json(user)
  }

  verifyBody = (body) => {
    if (body.title && body.body) return true

    return false
  }

  createArticle = async (req, res) => {
    const { body, goodies, image } = req.body

    if (goodies.length >= 3 && this.verifyBody(body)) {
      const response = verifyArticle(req.body)
      if (response.error) return res.status(400).json({ error: JSON.parse(response.error.message) })
      const input = {
        id: randomUUID(),
        image,
        ...response.data,
        body,
        goodies
      }

      const answer = await this.model.createArticle(input)

      if (answer) { return res.status(200).json({ message: 'Article Created' }) } else { return res.status(440).json({ message: 'There was an error during the post' }) }
    } else {
      res.status(400).json({ message: 'Cannot post the article (Check goodies and body)' })
    }
  }

  updateArticle = async (req, res) => {
    const { id } = req.params
    const { body, goodies, image } = req.body
    if (this.verifyBody(body) && goodies.length >= 3) {
      const response = verifyArticlePartial(req.body)
      if (response.error) return res.status(400).json({ message: 'Cannot patch the article' })
      const input = {
        image,
        ...response.data,
        body,
        goodies
      }
      const answer = await this.model.updateArticle({ input, id })
      if (!answer) return res.status(400).json({ message: 'Cannot patch the article' })
      return res.status(200).json({ message: 'Article updated' })
    } else { return res.status(400).json({ message: 'Cannot patch the article (check the input)' }) }
  }

  deleteArticle = async (req, res) => {
    const { id } = req.params
    const article = await this.model.deleteArticle({ id })
    if (!article) return res.status(400).json({ message: 'There was an error deleting the selected article' })

    res.status(200).json({ message: 'Article deleted' })
  }

  uploadImage = async (req, res) => {
    const image = req.file.path
    if (!image) {
      return res.status(400).json({ message: 'There was an error uploading the image' })
    }
    const url = await this.model.uploadImage(image)

    if (!url) {
      return res.status(400).json({ message: 'There was an error uploading the image' })
    }
    res.status(200).json({ sucess: true, url })
  }
}

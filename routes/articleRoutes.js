import { Router } from 'express'
import { ApiController } from '../controller/api-controller.js'
import multer from 'multer'

export const createRouter = ({ model }) => {
  const routes = Router()
  const controller = new ApiController({ model })
  const upload = multer({ dest: 'uploads/' })

  routes.get('/articles', controller.getArticles) // get lastests articles route

  routes.get('/users/:username', controller.authUser) // get user admin route

  routes.get('/articles/:id', controller.getArticleById) // get an entire article route

  routes.post('/articles', controller.createArticle) // create article route

  routes.delete('/articles/:id', controller.deleteArticle) // delete article route

  routes.put('/articles/:id', controller.updateArticle) // update article route

  routes.post('/images/upload', upload.single('image'), controller.uploadImage) // upload image route

  return routes
}

import { createBrowserRouter } from 'react-router-dom'
import Index from '../pages/index'
import Create from '../pages/create'
import Task from '../pages/task'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />
  },
  {
    path: '/create',
    element: <Create />
  },
  {
    path: '/task',
    element: <Task />
  }
])
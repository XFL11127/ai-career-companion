import { Routes, Route } from 'react-router-dom'
import Index from './pages/index'
import Create from './pages/create'
import Task from './pages/task'
import Chat from './pages/chat'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/create" element={<Create />} />
      <Route path="/task" element={<Task />} />
      <Route path="/chat/:agentId" element={<Chat />} />
    </Routes>
  )
}

export default App
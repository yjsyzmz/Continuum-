import React from 'react';
import ReactDOM from 'react-dom/client';
import TaskListApp from './TaskListApp';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TaskListApp />
  </React.StrictMode>,
);


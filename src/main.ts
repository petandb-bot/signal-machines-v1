import './styles/main.css';
import { AppController } from './app/AppController';
const root=document.querySelector<HTMLElement>('#app')!;
try { new AppController(root); }
catch(error) { const message=document.createElement('p');message.className='startup-error';message.textContent=`SIGNAL MACHINES could not start: ${error instanceof Error?error.message:String(error)}`;root.replaceChildren(message); }

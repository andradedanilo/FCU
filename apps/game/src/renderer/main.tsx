import { createRoot } from 'react-dom/client';
import {ScreenRecovery} from './ScreenRecovery.tsx';
import { App } from './App.tsx';
import './tokens.css';
createRoot(document.getElementById('root')!).render(<ScreenRecovery><App/></ScreenRecovery>);

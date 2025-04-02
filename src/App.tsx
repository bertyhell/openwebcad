import './App.scss';
import {Toolbar} from './components/Toolbar.tsx';

function App() {
  return (
    <div className="overflow-y-scroll h-lvh pb-12 w-80"  style={{scrollbarWidth: 'none'}}>
      <Toolbar />
    </div>
  );
}

export default App;

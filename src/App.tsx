import './App.scss';
import {Toolbar} from './components/Toolbar.tsx';

function App() {
  return (
    <div className="overflow-y-scroll h-lvh w-max pb-12"  style={{scrollbarWidth: 'none'}}>
      <Toolbar />
    </div>
  );
}

export default App;

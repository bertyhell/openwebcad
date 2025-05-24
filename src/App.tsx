import './App.css';
import {ToastContainer} from 'react-toastify';
import {Toolbar} from './components/Toolbar.tsx';

function App() {
	return (
		<div className="overflow-y-scroll h-lvh pb-12 w-80" style={{ scrollbarWidth: 'none' }}>
			<Toolbar />
			<ToastContainer position="bottom-right" theme="light" />
		</div>
	);
}

export default App;

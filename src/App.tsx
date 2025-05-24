import './App.css';
import {useState} from 'react';
import {ToastContainer} from 'react-toastify';
import {Toolbar} from './components/Toolbar.tsx';

function App() {
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<>
			<div
				className={`overflow-y-scroll h-lvh pb-12 fixed top-0 left-0 z-10 ${isCollapsed ? 'w-12' : 'w-80'}`}
				style={{ scrollbarWidth: 'none' }}
			>
				<Toolbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
			</div>
			{/* This div represents the main content area where the canvas would be. */}
			{/* Its left margin is adjusted based on the toolbar's collapsed state. */}
			<div
				id="canvas-container"
				className={`pt-2 pb-2 ${isCollapsed ? 'ml-12' : 'ml-80'}`}
				style={{ height: '100vh', boxSizing: 'border-box' }} // Ensure it takes up space
			>
				{/* Placeholder for canvas or other main content */}
				{/* The actual canvas is managed by main.tsx and will overlay this or be within a similar structure */}
			</div>
			<ToastContainer position="bottom-right" theme="light" />
		</>
	);
}

export default App;

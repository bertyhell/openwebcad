import './App.css';
import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import { Sidebar } from './components/sidebar/Sidebar.tsx';

function App() {
	useEffect(() => {
		// Prevent the browser from zooming the page when the user zooms the canvas with ctrl + scroll
		const handleWheel = (event: WheelEvent) => {
			if (event.ctrlKey) {
				event.preventDefault();
			}
		};
		window.addEventListener('wheel', handleWheel, { passive: false });
		return () => window.removeEventListener('wheel', handleWheel);
	}, []);

	return (
		<>
			<Sidebar />
			<ToastContainer
				position="bottom-center"
				theme="light"
				hideProgressBar
				closeButton={false}
				autoClose={1800}
			/>
		</>
	);
}

export default App;

// Import Three.js and its necessary components using importmap specifiers
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Console log to confirm script execution start
console.log("script.js execution started.");

// Declare global/module-level variables for Three.js components
// This allows them to be accessed and updated across different functions
let scene, camera, renderer, modelObject, controls;

// Add an event listener that fires when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Attempting to get elements.");

    // Get references to HTML elements
    const modelForm = document.getElementById('modelForm');
    const responseMessage = document.getElementById('responseMessage');
    const modelOutputContainer = document.getElementById('modelOutput'); // The parent container for viewer
    const modelViewerContainer = document.getElementById('modelViewer'); // The specific div for the 3D canvas

    // Confirm elements are found in the console
    console.log("modelForm found:", !!modelForm);
    console.log("modelViewerContainer found:", !!modelViewerContainer);

    // --- Initial Three.js Scene Setup (runs once on page load) ---
    // Create the WebGL renderer
    renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias for smoother edges
    // Set renderer size to match the container's client dimensions
    renderer.setSize(modelViewerContainer.clientWidth, modelViewerContainer.clientHeight);
    // Append the renderer's DOM element (the <canvas>) to the viewer container
    modelViewerContainer.appendChild(renderer.domElement);
    // Ensure the canvas is displayed correctly
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.background = 'blue'; // Temporary: Keep blue background for visual confirmation
    console.log("Initial renderer DOM element created and appended.");

    // Create the 3D scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); // Set a dark grey background for the scene itself
    console.log("Initial scene created.");

    // Create the camera (PerspectiveCamera for 3D perspective)
    // Args: FOV, Aspect Ratio, Near Plane, Far Plane
    camera = new THREE.PerspectiveCamera(75, modelViewerContainer.clientWidth / modelViewerContainer.clientHeight, 0.1, 1000);
    camera.position.z = 2; // Position the camera back to see the default scene setup
    console.log("Initial camera created. Position:", camera.position);

    // Add AxesHelper to the scene (visible from start)
    // This helps visualize the origin (0,0,0) and axes (X=red, Y=green, Z=blue)
    const axesHelper = new THREE.AxesHelper(5); // Size of the axes
    scene.add(axesHelper);
    console.log("AxesHelper added to initial scene.");

    // Add lighting to the scene (important for seeing materials)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light, illuminates all objects evenly
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Light from a specific direction
    directionalLight.position.set(0, 1, 1).normalize(); // Position it top-front-right
    scene.add(directionalLight);
    console.log("Ambient and Directional lights added.");

    // Initialize OrbitControls for user interaction
    // Allows rotating, panning, zooming the camera with mouse
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Provides a smooth, natural feel
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false; // Prevents camera from going beyond target
    controls.maxPolarAngle = Math.PI / 2; // Restrict vertical rotation (prevents going below ground)
    console.log("OrbitControls initialized.");

    // Define the animation loop
    // This function is called repeatedly to render the scene and update controls
    function animate() {
        requestAnimationFrame(animate); // Request the next frame
        controls.update(); // Update OrbitControls (necessary if enableDamping is true)
        renderer.render(scene, camera); // Render the scene from the camera's perspective
    }
    animate(); // Start the animation loop immediately on page load
    console.log("Animation loop started.");

    // --- Function to Load and Display the 3D Model (called after backend response) ---
    function setup3DViewer(modelUrl) {
        console.log("setup3DViewer function called with URL:", modelUrl);

        // Remove any previously loaded model from the scene
        if (modelObject) {
            scene.remove(modelObject);
            modelObject = null;
            console.log("Previous model removed from scene.");
        }

        // Initialize OBJLoader
        const loader = new OBJLoader();
        loader.load(
            modelUrl, // The URL of your .obj model (e.g., /generated_models/mock_cube.obj)
            // On successful load
            function (object) {
                console.log("Loaded object:", object);
                console.log("Loaded object position (before set):", object.position);
                console.log("Loaded object scale (before set):", object.scale);

                // Position the loaded object. For a 1x1x1 cube defined from (0,0,0) to (1,1,1),
                // setting its position to (0.5, 0.5, 0.5) centers it around the origin of the axes.
                object.position.set(0.5, 0.5, 0.5);
                object.visible = true; // Ensure the object is visible

                // Force a basic visible material onto the loaded object's meshes
                // OBJ models might not have materials or they might be problematic.
                // This ensures it's always visible as a red object.
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Solid red color
                        child.material.transparent = false; // Ensure not transparent
                        child.material.opacity = 1; // Ensure full opacity
                        child.material.side = THREE.DoubleSide; // Render both sides of faces
                    }
                });
                console.log("Forced a basic red material onto the loaded object's meshes.");

                scene.add(object); // Add the loaded object to the Three.js scene
                modelObject = object; // Store a reference to the loaded model
                console.log("3D model loaded and added to scene!");
                responseMessage.textContent = "Model generated and displayed!";
                responseMessage.style.color = 'green';

                // Calculate bounding box and center for camera adjustment
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                console.log("Loaded model bounding box size:", size);
                console.log("Loaded model bounding box center:", center);

                // Adjust camera position to frame the loaded model
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                cameraZ *= 1.5; // Add some padding for better view

                camera.position.set(center.x, center.y, cameraZ + center.z);
                camera.lookAt(center); // Make camera look at the model's center
                console.log("Adjusted camera position to:", camera.position);
                console.log("Camera looking at:", center);

                // Update OrbitControls target to the center of the loaded object
                controls.target.copy(center);
                controls.update(); // Update controls after changing target
                console.log("OrbitControls target updated.");

                renderer.render(scene, camera); // Force a render immediately after adding the object
                console.log("Forced a render after model load.");
            },
            // On progress
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                responseMessage.textContent = `Loading 3D model: ${Math.round(xhr.loaded / xhr.total * 100)}%`;
            },
            // On error
            function (error) {
                console.error('An error happened during model loading:', error);
                responseMessage.textContent = `Error loading 3D model: ${error.message}`;
                responseMessage.style.color = 'red';
            }
        );
    }

    // --- Form Submission Handler ---
    if (modelForm) {
        modelForm.addEventListener('submit', async (event) => {
            console.log("Form submit event detected.");
            event.preventDefault(); // Prevent the default form submission (page reload)

            responseMessage.textContent = 'Generating model... Please wait.';
            responseMessage.style.color = '#007bff';
            // IMPORTANT: DO NOT clear modelViewerContainer.innerHTML here, as it removes the canvas!
            // modelOutputContainer.innerHTML = ''; // Keep this commented or removed if modelViewer is inside it

            const formData = new FormData(modelForm); // Gather form data

            try {
                // Send form data to the backend
                const response = await fetch('http://127.0.0.1:8000/generate-model/', {
                    method: 'POST',
                    body: formData
                });
                console.log("Backend fetch request sent.");

                // Check if the response was successful
                if (!response.ok) {
                    const errorData = await response.json(); // Parse error details if available
                    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
                }

                const result = await response.json(); // Parse the JSON response from the backend
                console.log("Backend response received:", result);

                // Call the 3D viewer setup function with the model URL from the backend
                if (result.generated_model_url) {
                    const fullModelUrl = `http://127.0.0.1:8000${result.generated_model_url}`;
                    console.log("Calling setup3DViewer with URL:", fullModelUrl);
                    setup3DViewer(fullModelUrl); // This function will update responseMessage internally
                } else {
                    // Handle cases where the backend didn't provide a model URL
                    responseMessage.textContent = `${result.message || 'Model generation complete, but no model URL provided.'}`;
                    responseMessage.style.color = 'orange';
                    console.warn('Backend response missing generated_model_url:', result);
                }

            } catch (error) {
                // Handle any errors during the fetch or model setup process
                console.error('An error occurred during fetch or model setup:', error);
                responseMessage.textContent = `Error generating model: ${error.message}`;
                responseMessage.style.color = 'red';
                // modelOutputContainer.innerHTML = ''; // Keep this commented or removed
            }
        });
    } else {
        console.error("Error: modelForm element not found!");
    }

    // --- Window Resize Listener ---
    // Ensure the 3D viewer remains responsive when the browser window is resized
    window.addEventListener('resize', () => {
        // Only update if Three.js components are initialized
        if (camera && renderer && modelViewerContainer) {
            camera.aspect = modelViewerContainer.clientWidth / modelViewerContainer.clientHeight;
            camera.updateProjectionMatrix(); // Update camera's projection matrix
            renderer.setSize(modelViewerContainer.clientWidth, modelViewerContainer.clientHeight); // Resize renderer
            controls.update(); // Update controls after resize
        }
    });

}); // End of DOMContentLoaded listener
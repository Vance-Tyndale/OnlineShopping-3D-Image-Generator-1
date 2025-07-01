from fastapi import FastAPI, UploadFile, File, Form # Added UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # NEW IMPORT for serving static files
import os 
import uuid 
import shutil 
import asyncio 

app = FastAPI()


UPLOAD_DIRECTORY = "uploaded_images" 
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# NEW: Directory for generated 3D models
GENERATED_MODELS_DIRECTORY = "generated_models"
os.makedirs(GENERATED_MODELS_DIRECTORY, exist_ok=True)

# NEW: Mount a static directory to serve generated models
app.mount(
    "/generated_models", # This is the URL path (e.g., http://127.0.0.1:8000/generated_models/my_model.obj)
    StaticFiles(directory=GENERATED_MODELS_DIRECTORY), # This is the local file system directory
    name="generated_models" # A name for this static files route
)


origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "http://localhost:8001",
    # Example for Live Server:
    # "http://127.0.0.1:5500",
    # "http://localhost:5500"
    # "null"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing endpoint
@app.get("/")
async def read_root():
    return {"message": "Welcome to your TMI App Backend!"}

# NEW ENDPOINT: To receive measurements and image
@app.post("/generate-model/")
async def create_model(
    height: int = Form(...),      # Use Form() for form fields
    weight: int = Form(...),
    bust: int = Form(...),       # Optional fields can have default None
    waist: int = Form(...),
    hips: int = Form(...),
    userImage: UploadFile = File(...) # Use File() for file uploads
):
    file_extension = None # Initialize to None in case of early error
    file_path = None
    
    try:
            # --- Image Saving Logic ---
        file_extension = os.path.splitext(userImage.filename)[1] # Gets .jpg, .png etc.
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)
    
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(userImage.file, buffer)
        print(f"Image saved successfully to: {file_path}")
        file_extension = unique_filename

        # --- End Image Saving Logic ---

    # --- Conceptual AI Model Integration Point ---
        print("--- Simulating AI model generation (e.g., 5 seconds delay) ---")
        # HERE is where you would integrate your actual AI model.
        # This could involve:
        # 1. Loading a pre-trained model (e.g., using TensorFlow, PyTorch).
        # 2. Passing 'file_path' and 'measurements' to the model.
        # 3. Calling an external API service for 3D generation.
        await asyncio.sleep(5) # Simulate processing time

        mock_model_id = str(uuid.uuid4()) # Keep the ID for display
        mock_model_url = "/generated_models/mock_cube.obj" # Use a fixed name for the mock model file

        print(f"--- Mock 3D Model Generated: {mock_model_id} ---")

        # --- Image Deletion Logic (after processing) ---
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            print(f"Image deleted successfully: {file_path}")
        else:
            print(f"Warning: Image not found for deletion at {file_path}")

        # --- End AI Mock & Deletion Logic ---
        
        return {
        "message": "Data received successfully! (Model generation is pending)",
        "measurements": {
            "height": height,
            "weight": weight,
            "bust": bust,
            "waist": waist,
            "hips": hips
        },
        "original_image_filename": userImage.filename,
        "generated_model_id": mock_model_id,
        "generated_model_url": mock_model_url 
    }
        
    except Exception as e:
        # If an error occurs during saving or processing, try to clean up
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"Cleaned up partially saved image due to error: {file_path}")
            except Exception as cleanup_e:
                print(f"Error during cleanup of partially saved image: {cleanup_e}")

        print(f"Error processing model generation: {e}")
        return {
            "message": f"Error processing model generation: {e}",
            "status": "error"
        }, 500
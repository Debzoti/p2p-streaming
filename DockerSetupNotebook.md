# Docker Setup and Execution Notebook

This notebook serves as a guide for setting up Docker and executing required Docker commands up to the execution of the start script.

### Prerequisites
- Ensure Docker is installed on your system.
- Have your application code ready and Dockerfile prepared.

### Step 1: Build the Docker Image
Build the Docker image from your Dockerfile with the following command:
```bash
docker build -t my-stream-app .
```

### Step 2: Run the Docker Container
Run the container with mounted volumes to have access to files as needed:
```bash
docker run -v /full/path/to/input.mp4:/app/input.mp4 \
           -v /full/path/to/app/public:/app/public \
           my-stream-app
```
- Replace `/full/path/to/input.mp4` and `/full/path/to/app/public` with your actual paths on the host.

### Step 3: Start the Container
If the container has been stopped, you can restart it with:
```bash
docker start my-stream-app
```

### Step 4: Run the Start Script
Ensure you have execution permissions and then run the script:
1. **Change permissions** (if needed):
   ```bash
   docker exec my-stream-app chmod +x /app/start.sh
   ```

2. **Execute the script**:
   ```bash
   docker exec my-stream-app /app/start.sh
   ```

### Troubleshooting
- **Address In Use Error**: If you encounter an address already in use error, identify and kill the process using the port:
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```
   Replace `<PID>` with the actual process ID using the port.

### Notes
- The above commands assume that the script and necessary files are correctly set up in the Docker image and the container environment.
- Ensure all paths are correct and consistent with your project structure.

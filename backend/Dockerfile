# Use the official Python 3.12 image to match your Fedora environment
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the actual application code into the container
COPY ./app /app/app

# Expose the port that Uvicorn will run on
EXPOSE 8000

# The command to start the FastAPI server
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
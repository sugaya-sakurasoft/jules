# PostgreSQL Connection Test (TypeScript & Node.js)

This project demonstrates a basic connection to a PostgreSQL database using TypeScript and Node.js. It includes functionalities for:
- Connecting to the database.
- Creating a table (if it doesn't exist).
- Inserting new data.
- Retrieving data.

## Prerequisites

- Node.js (v18 or later recommended)
- npm (comes with Node.js)
- A running PostgreSQL instance

## Setup

1.  **Clone the repository (or download the `db_test` folder).**

2.  **Navigate to the project directory:**
    ```bash
    cd db_test
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Configure environment variables:**
    Create a `.env` file in the `db_test` directory by copying the example:
    ```bash
    cp .env.example .env
    ```
    (If `.env.example` is not provided, create `.env` manually)

    Edit the `.env` file with your PostgreSQL database credentials:
    ```
    DB_HOST=your_db_host
    DB_PORT=your_db_port
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=your_db_name
    ```
    Replace `your_db_host`, `your_db_port`, etc., with your actual database details. The sample code uses `localhost`, `5432` as defaults if these are not set.

## Running the Application

There are two main ways to run the application:

1.  **Using `ts-node` (for development):**
    This command compiles and runs the TypeScript code directly.
    ```bash
    npm start
    ```

2.  **Building and running the JavaScript output (for production-like execution):**
    -   First, build the TypeScript code into JavaScript:
        ```bash
        npm run build
        ```
        This will create a `dist` folder with the compiled JavaScript files.
    -   Then, run the compiled code:
        ```bash
        npm run serve
        ```

## Project Structure

-   `src/index.ts`: Main application logic for database interaction.
-   `package.json`: Project metadata and dependencies.
-   `tsconfig.json`: TypeScript compiler options.
-   `.env`: Environment variable storage (ignored by Git).
-   `.gitignore`: Specifies intentionally untracked files that Git should ignore.
-   `README.md`: This file.

## Troubleshooting

-   **`tsc: command not found` or `ts-node: command not found`:**
    Ensure that `npm install` completed successfully and that `node_modules/.bin` is in your PATH or use `npx tsc`/`npx ts-node`.
-   **Database connection errors:**
    -   Verify that your PostgreSQL server is running.
    -   Double-check the credentials in your `.env` file (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
    -   Ensure that the specified database (`DB_NAME`) exists and the user (`DB_USER`) has the necessary permissions.
    -   Check firewall rules if your database is not on `localhost`.

## Note on Sandboxed Environment Execution
During development within certain sandboxed environments, `npm install` might not correctly populate the `node_modules/.bin` directory. If you encounter issues running `npm start` or `npm run build` due to missing `tsc` or `ts-node` commands, this could be the cause. The code and configuration are standard, and should work in a typical local Node.js environment.

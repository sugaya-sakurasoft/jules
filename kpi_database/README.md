# KPI Database Data Migration Script

This script is a TypeScript conversion of a Java program designed to migrate payment data from multiple PostgreSQL databases to a central MySQL database.

## Project Structure

```
kpi_database/
├── dist/                     # Compiled JavaScript files (output of tsc)
├── node_modules/             # Project dependencies (created by npm install)
├── src/                      # TypeScript source files
│   ├── db.ts                 # Database connection helpers
│   ├── dateUtils.ts          # Date manipulation utility functions
│   └── main.ts               # Main script logic
├── .gitignore                # Specifies intentionally untracked files that Git should ignore
├── package.json              # Project metadata and dependencies
├── package-lock.json         # Records exact versions of dependencies
└── tsconfig.json             # TypeScript compiler options
```

## Prerequisites

-   Node.js (v14.x or later recommended)
-   npm (usually comes with Node.js)
-   Access to the source PostgreSQL databases
-   Access to the target MySQL database

## Setup

1.  **Clone the repository (if applicable) or ensure all files are in the `kpi_database` directory.**

2.  **Navigate to the project directory:**
    ```bash
    cd kpi_database
    ```

3.  **Install dependencies:**
    The `pg` (for PostgreSQL), `mysql2` (for MySQL), and `typescript` packages are required.
    ```bash
    npm install
    ```
    *(Note: Due to limitations in the automated generation environment, `node_modules` might not have been pre-installed. This step is crucial.)*

4.  **Configure Database Connections:**
    Open `src/main.ts` and update the database connection configurations:
    -   `mySqlConfig`: Update with your MySQL server details (host, user, password, database, port).
    -   `postgresConfigs`: Update the array with connection details for each of your PostgreSQL source databases.

    **Security Note:** It is highly recommended to use environment variables or a configuration management system for sensitive information like database passwords, rather than hardcoding them directly in the source file.

## Building the Project

To compile the TypeScript code into JavaScript, run:

```bash
npm run build
```
This will use `tsc` (the TypeScript compiler) and the settings in `tsconfig.json` to generate JavaScript files in the `dist` directory.

## Running the Script

After building the project, you can run the migration script using:

```bash
npm start
```
This command executes the compiled `dist/main.js` file using Node.js.

The script will:
1.  Connect to the target MySQL database.
2.  Determine the date from which to start fetching data (based on the last `insert_date` in `stat_product_success` or a default start date).
3.  Iterate through each configured PostgreSQL source:
    a.  Connect to the PostgreSQL database.
    b.  Fetch payment data within the calculated date range.
    c.  Insert the fetched data into the `stat_product_success` table in the MySQL database.
4.  Log progress and any errors to the console.

## Error Handling

-   Errors during individual PostgreSQL channel processing are logged to the console, but the script will attempt to continue with other channels.
-   Critical errors (e.g., inability to connect to the MySQL database) will terminate the script.
-   All database connections are intended to be closed gracefully, even if errors occur.

## Development

-   Source code is in the `src` directory.
-   After making changes to `.ts` files, you need to rebuild the project using `npm run build` before running `npm start` to see the effects.
-   You can install TypeScript globally (`npm install -g typescript`) or use the version installed in `node_modules` via `npx tsc`.
```

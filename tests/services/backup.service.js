const { exec } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const logger = require("../utils/logger");
const env = require("../config/env");

/**
 * Create database backup
 */
const createBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(__dirname, "../../backups");
    const backupFile = path.join(backupDir, `backup-${timestamp}.gz`);

    // Create backups directory if it doesn't exist
    await fs.mkdir(backupDir, { recursive: true });

    // Create backup command
    const command = `mongodump --uri="${env.MONGODB_URI}" --archive="${backupFile}" --gzip`;

    return new Promise((resolve, reject) => {
      exec(command, (error, _stdout, _stderr) => {
        if (error) {
          logger.error("Backup error:", error);
          reject(error);
          return;
        }

        logger.info(`Backup created successfully: ${backupFile}`);
        resolve({
          success: true,
          file: backupFile,
          timestamp,
        });
      });
    });
  } catch (error) {
    logger.error("Error creating backup:", error);
    throw error;
  }
};

/**
 * Restore database from backup
 */
const restoreBackup = async (backupFile) => {
  try {
    if (
      !(await fs
        .access(backupFile)
        .then(() => true)
        .catch(() => false))
    ) {
      throw new Error("Backup file not found");
    }

    const command = `mongorestore --uri="${env.MONGODB_URI}" --archive="${backupFile}" --gzip --drop`;

    return new Promise((resolve, reject) => {
      exec(command, (error, _stdout, _stderr) => {
        if (error) {
          logger.error("Restore error:", error);
          reject(error);
          return;
        }

        logger.info("Backup restored successfully");
        resolve({
          success: true,
          message: "Database restored successfully",
        });
      });
    });
  } catch (error) {
    logger.error("Error restoring backup:", error);
    throw error;
  }
};

/**
 * List all backups
 */
const listBackups = async () => {
  try {
    const backupDir = path.join(__dirname, "../../backups");

    // Create directory if it doesn't exist
    await fs.mkdir(backupDir, { recursive: true });

    const files = await fs.readdir(backupDir);

    const backups = await Promise.all(
      files
        .filter((file) => file.endsWith(".gz"))
        .map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);

          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
          };
        }),
    );

    return backups.sort((a, b) => b.created - a.created);
  } catch (error) {
    logger.error("Error listing backups:", error);
    throw error;
  }
};

/**
 * Delete old backups (keep last N backups)
 */
const cleanOldBackups = async (keepCount = 5) => {
  try {
    const backups = await listBackups();

    if (backups.length <= keepCount) {
      return {
        deleted: 0,
        message: "No old backups to delete",
      };
    }

    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
      await fs.unlink(backup.path);
      logger.info(`Deleted old backup: ${backup.name}`);
    }

    return {
      deleted: toDelete.length,
      message: `Deleted ${toDelete.length} old backups`,
    };
  } catch (error) {
    logger.error("Error cleaning old backups:", error);
    throw error;
  }
};

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  cleanOldBackups,
};

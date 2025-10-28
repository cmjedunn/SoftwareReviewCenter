import { v4 as uuidv4 } from 'uuid';
import { controllerLimiter } from '../utils/limiter.js';

/**
 * 🎯 Job Manager - Handles async requests with WebSocket updates
 * 
 * Perfect for 3-4 concurrent users, simple in-memory implementation
 */
class JobManager {
    static instance = null;

    static getInstance() {
        if (!JobManager.instance) {
            JobManager.instance = new JobManager();
        }
        return JobManager.instance;
    }

    constructor() {
        this.jobs = new Map();           // jobId -> job data
        this.jobQueue = [];              // array of jobIds waiting to be processed
        this.subscribers = new Map();    // jobId -> Set of WebSocket connections
        this.userJobs = new Map();       // userId -> Set of active jobIds
        this.isProcessing = false;       // simple processing flag
        this.clientConnections = new WeakMap(); // ws -> metadata

        // Start processing queue
        this.processQueue();
    }

    /**
  * 📝 Create a new job and return jobId immediately
  */
    createJob(type, data, clientWs = null, userId = null) {
        const jobId = uuidv4();

        console.log('🚀 Creating job:', {
            jobId,
            type,
            userId,
            hasUserId: !!userId,
            userIdType: typeof userId
        });

        const job = {
            id: jobId,
            type,
            data,
            status: 'queued',
            position: this.jobQueue.length + 1,
            progress: 0,
            result: null,
            error: null,
            message: null,
            userId: userId, // Track which user owns this job
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.jobs.set(jobId, job);
        this.jobQueue.push(jobId);

        // Track user -> job mapping
        if (userId) {
            if (!this.userJobs.has(userId)) {
                this.userJobs.set(userId, new Set());
                console.log(`📝 Created new user entry for: ${userId}`);
            }
            this.userJobs.get(userId).add(jobId);
            console.log(`📝 Added job ${jobId} to user ${userId}'s job list`);
            console.log(`📝 User ${userId} now has jobs:`, Array.from(this.userJobs.get(userId)));
        } else {
            console.log(`⚠️ Job ${jobId} created without userId!`);
        }

        console.log(`📝 Total jobs: ${this.jobs.size}, Total users: ${this.userJobs.size}`);
        console.log(`📝 All user IDs: ${Array.from(this.userJobs.keys())}`);

        return jobId;
    }

    /**
     * 🔄 Main queue processing loop
     */
    async processQueue() {
        setInterval(async () => {
            if (this.isProcessing || this.jobQueue.length === 0) {
                return;
            }

            this.isProcessing = true;
            const jobId = this.jobQueue.shift();

            try {
                await this.processJob(jobId);
            } catch (error) {
                console.error(`❌ Error processing job ${jobId}:`, error);
                this.updateJobStatus(jobId, 'error', 0, null, error.message);
            }

            // Update queue positions for remaining jobs
            this.updateQueuePositions();
            this.isProcessing = false;
        }, 100); // Check queue every 100ms
    }

    /**
     * ⚙️ Process individual job using your existing controller logic
     */
    async processJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        console.log(`⚙️ Processing job ${jobId} (${job.type})`);
        this.updateJobStatus(jobId, 'processing', 10);

        try {
            let result;

            // Create progress callback that the controller can use
            const progressCallback = (progress, message) => {
                this.updateJobStatus(jobId, 'processing', progress, null, null, message);
            };

            // Route to appropriate handler based on job type
            switch (job.type) {
                case 'createApplicationRecord':
                    result = await this.processCreateApplicationRecord(jobId, job.data, progressCallback);
                    break;
                case 'deleteApplicationRecord':
                    result = await this.processDeleteApplicationRecord(jobId, job.data, progressCallback);
                    break;
                default:
                    throw new Error(`Unknown job type: ${job.type}`);
            }

            this.updateJobStatus(jobId, 'completed', 100, result);
            console.log(`✅ Completed job ${jobId}`);

        } catch (error) {
            this.updateJobStatus(jobId, 'error', 0, null, error.message);
            console.error(`❌ Failed job ${jobId}:`, error.message);
        }
    }

    /**
     * 🏗️ Process application record creation (using your existing logic)
     */
    async processCreateApplicationRecord(jobId, { name, owner, description, environment }, progressCallback) {
        // Import your existing wrapped function (with rate limiting)
        const { createApplicationRecordData } = await import('../api/records/applicationRecords/applicationRecords.controller.js');

        progressCallback(25, 'Creating application record...');

        // Pass the progress callback to your controller function
        const result = await createApplicationRecordData(name, owner, description, environment, progressCallback);

        return result;
    }

    /**
     * 🗑️ Process application record deletion
     */
    async processDeleteApplicationRecord(jobId, { recordId }, progressCallback) {
        const { deleteApplicationRecordData } = await import('../api/records/applicationRecords/applicationRecords.controller.js');

        progressCallback(50, 'Deleting application record...');

        // Pass the progress callback to your controller function  
        const result = await deleteApplicationRecordData(recordId, progressCallback);

        return result;
    }

    /**
     * 📊 Update job status and notify subscribers
     */
    updateJobStatus(jobId, status, progress = null, result = null, error = null, message = null) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        job.status = status;
        if (progress !== null) job.progress = progress;
        if (result !== null) job.result = result;
        if (error !== null) job.error = error;
        if (message !== null) job.message = message;
        job.updatedAt = new Date();

        this.broadcastJobUpdate(jobId);

        // Clean up completed jobs from user tracking after a delay
        if (status === 'completed' || status === 'error') {
            setTimeout(() => {
                this.cleanupCompletedJob(jobId);
            }, 30000); // Keep completed jobs for 30 seconds for status checking
        }
    }

    /**
     * 📡 Subscribe WebSocket connection to job updates
     */
    subscribeToJob(jobId, ws) {
        if (!this.subscribers.has(jobId)) {
            this.subscribers.set(jobId, new Set());
        }
        this.subscribers.get(jobId).add(ws);
    }

    /**
     * 📢 Broadcast job update to all subscribers
     */
    broadcastJobUpdate(jobId) {
        const job = this.jobs.get(jobId);
        const subscribers = this.subscribers.get(jobId);

        if (!job || !subscribers) return;

        const update = {
            type: 'jobUpdate',
            jobId,
            status: job.status,
            progress: job.progress,
            position: job.position,
            message: job.message,
            result: job.status === 'completed' ? job.result : null,
            error: job.status === 'error' ? job.error : null,
            updatedAt: job.updatedAt
        };

        subscribers.forEach(ws => {
            if (ws.readyState === 1) { // WebSocket.OPEN
                try {
                    ws.send(JSON.stringify(update));
                } catch (error) {
                    console.warn('⚠️ Failed to send WebSocket message:', error);
                    subscribers.delete(ws);
                }
            } else {
                subscribers.delete(ws);
            }
        });
    }

    /**
     * 📋 Get current job status (for initial connection)
     */
    getJobStatus(jobId) {
        return this.jobs.get(jobId) || null;
    }


    /**
     * 🧹 Clean up completed job from user tracking
     */
    cleanupCompletedJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        // Remove from user jobs tracking
        if (job.userId && this.userJobs.has(job.userId)) {
            this.userJobs.get(job.userId).delete(jobId);
            if (this.userJobs.get(job.userId).size === 0) {
                this.userJobs.delete(job.userId);
            }
        }

        // Keep the job data for a bit longer in case of late status checks
        // but mark it as cleaned up
        job.cleanedUp = true;

        console.log(`🧹 Cleaned up completed job ${jobId} for user ${job.userId}`);
    }

    /**
     * 🧹 Clean up client connections
     */
    removeClient(ws) {
        this.subscribers.forEach((wsSet, jobId) => {
            wsSet.delete(ws);
            if (wsSet.size === 0) {
                this.subscribers.delete(jobId);
            }
        });
    }

    /**
     * 📊 Update queue positions after job completion
     */
    updateQueuePositions() {
        this.jobQueue.forEach((jobId, index) => {
            const job = this.jobs.get(jobId);
            if (job) {
                job.position = index + 1;
            }
        });
    }

    /**
     * 📈 Get queue status (for monitoring)
     */
    getQueueStatus() {
        return {
            queueLength: this.jobQueue.length,
            isProcessing: this.isProcessing,
            totalJobs: this.jobs.size,
            activeSubscribers: this.subscribers.size
        };
    }

    /**
 * 👤 Get active jobs for a specific user
 */
    getActiveJobsForUser(userId) {
        if (!userId || !this.userJobs.has(userId)) {
            return [];
        }

        const jobIds = this.userJobs.get(userId);
        const activeJobs = [];

        for (const jobId of jobIds) {
            const job = this.jobs.get(jobId);
            if (job && (job.status === 'queued' || job.status === 'processing')) {
                activeJobs.push({
                    id: job.id,
                    type: job.type,
                    status: job.status,
                    progress: job.progress,
                    message: job.message,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt
                });
            }
        }

        return activeJobs;
    }

    /**
     * 👤 Get the most recent active job for a user
     */
    getMostRecentActiveJobForUser(userId) {
        const activeJobs = this.getActiveJobsForUser(userId);
        if (activeJobs.length === 0) return null;

        // Return the most recently created active job
        return activeJobs.sort((a, b) => b.createdAt - a.createdAt)[0];
    }


}

export { JobManager };

import { create } from 'zustand';
import { Job } from '@/types';

interface JobState {
  jobs: Job[];
  selectedJob: Job | null;
  setJobs: (jobs: Job[]) => void;
  setSelectedJob: (job: Job | null) => void;
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  selectedJob: null,
  setJobs: (jobs) => set({ jobs }),
  setSelectedJob: (job) => set({ selectedJob: job }),
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job)),
      selectedJob: state.selectedJob?.id === jobId ? { ...state.selectedJob, ...updates } : state.selectedJob,
    })),
}));

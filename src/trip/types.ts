export type ItemStatus = "planned" | "locked" | "done";

export type TripItem = {
  id: string;
  date: string;
  time: string;
  title: string;
  category: "flight" | "food" | "event" | "hotel" | "drive" | "errand";
  location: string;
  address: string;
  durationMinutes: number;
  status: ItemStatus;
  priority: "low" | "medium" | "high";
  costEstimate?: number;
  confirmation?: string;
  leaveBy?: string;
  notes: string[];
  parking?: {
    primary: string;
    backup: string;
    warning?: string;
  };
  links: {
    label: string;
    url: string;
  }[];
};

export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type Checklist = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

export type TripDocument = {
  id: string;
  title: string;
  type: "pdf" | "image" | "code" | "note";
  location: string;
  note: string;
};

export type Trip = {
  id: string;
  title: string;
  subtitle: string;
  dates: {
    start: string;
    end: string;
  };
  base: {
    hotel: string;
    car: string;
    timezone: string;
  };
  items: TripItem[];
  checklists: Checklist[];
  documents: TripDocument[];
  updatedAt: string;
};

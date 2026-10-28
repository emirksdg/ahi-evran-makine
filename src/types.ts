export interface StaffMember {
  name: string;
  title: string;
  department: string;
  initials: string;
}

export interface Course {
  name: string;
}

export interface StaffFilters {
  query: string;
  department?: string;
}

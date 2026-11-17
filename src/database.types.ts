export interface Database {
  public: {
    Tables: {
      universities: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      university_email_domains: {
        Row: {
          id: string;
          university_id: string;
          email_domain: string;
          evidence_url: string;
          verified_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          email_domain: string;
          evidence_url: string;
          verified_at: string;
          created_at?: string;
        };
        Update: {
          university_id?: string;
          email_domain?: string;
          evidence_url?: string;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "university_email_domains_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          department: string;
          bio: string | null;
          university_name: string | null;
          avatar_path: string | null;
          university_id: string | null;
          institution_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          department: string;
          bio?: string | null;
          university_name?: string | null;
          avatar_path?: string | null;
          university_id?: string | null;
          institution_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          department?: string;
          bio?: string | null;
          university_name?: string | null;
          avatar_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          content: string;
          category: "Fikir" | "Ders" | "Kampüs";
          like_count: number;
          group_id: string | null;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          content: string;
          category: "Fikir" | "Ders" | "Kampüs";
          like_count?: number;
          group_id?: string | null;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: {
          content?: string;
          category?: "Fikir" | "Ders" | "Kampüs";
        };
        Relationships: [
          {
            foreignKeyName: "posts_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          content: string;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string;
          scope: "global" | "university";
          university_id: string | null;
          department: string | null;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string;
          scope?: "global" | "university";
          university_id?: string | null;
          department?: string | null;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          department?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "groups_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: { group_id: string; user_id: string; joined_at: string };
        Insert: { group_id: string; user_id: string; joined_at?: string };
        Update: never;
        Relationships: [];
      };
      group_join_requests: {
        Row: {
          id: string;
          group_id: string;
          requester_id: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          requester_id: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          type:
            | "group_join_request"
            | "group_join_approved"
            | "group_join_rejected"
            | "group_message"
            | "post_comment"
            | "post_like";
          title: string;
          body: string;
          group_id: string | null;
          post_id: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          type:
            | "group_join_request"
            | "group_join_approved"
            | "group_join_rejected"
            | "group_message"
            | "post_comment"
            | "post_like";
          title: string;
          body?: string;
          group_id?: string | null;
          post_id?: string | null;
          created_at?: string;
          read_at?: string | null;
        };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      user_blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          group_id: string;
          author_id: string;
          content: string;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          author_id: string;
          content: string;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      content_reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "post" | "comment" | "message" | "group";
          target_id: string;
          target_excerpt: string;
          target_author_name: string;
          target_hidden: boolean;
          reason:
            | "spam"
            | "harassment"
            | "inappropriate"
            | "privacy"
            | "other";
          details: string;
          status: "open" | "reviewed" | "dismissed";
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: "post" | "comment" | "message" | "group";
          target_id: string;
          target_excerpt: string;
          target_author_name: string;
          target_hidden?: boolean;
          reason:
            | "spam"
            | "harassment"
            | "inappropriate"
            | "privacy"
            | "other";
          details?: string;
          status?: "open" | "reviewed" | "dismissed";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      site_feedback: {
        Row: {
          id: string;
          user_id: string;
          user_display_name: string;
          category: "design" | "feature" | "issue" | "other";
          message: string;
          status: "new" | "reviewed";
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_display_name: string;
          category: "design" | "feature" | "issue" | "other";
          message: string;
          status?: "new" | "reviewed";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_moderator: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      submit_content_report: {
        Args: {
          p_target_type: string;
          p_target_id: string;
          p_reason: string;
          p_details?: string;
        };
        Returns: string;
      };
      moderate_content_report: {
        Args: {
          p_report_id: string;
          p_decision: string;
        };
        Returns: undefined;
      };
      submit_site_feedback: {
        Args: {
          p_category: string;
          p_message: string;
        };
        Returns: string;
      };
      mark_site_feedback_reviewed: {
        Args: {
          p_feedback_id: string;
        };
        Returns: undefined;
      };
      request_group_join: {
        Args: {
          target_group_id: string;
        };
        Returns: string;
      };
      review_group_join_request: {
        Args: {
          target_request_id: string;
          approve: boolean;
        };
        Returns: undefined;
      };
      is_user_blocked: {
        Args: {
          target_user_id: string;
        };
        Returns: boolean;
      };
      block_user: {
        Args: {
          target_user_id: string;
        };
        Returns: undefined;
      };
      unblock_user: {
        Args: {
          target_user_id: string;
        };
        Returns: undefined;
      };
      get_group_summaries: {
        Args: {
          target_group_ids: string[];
        };
        Returns: {
          group_id: string;
          owner_name: string;
          member_count: number;
          last_message_at: string | null;
          last_message_preview: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

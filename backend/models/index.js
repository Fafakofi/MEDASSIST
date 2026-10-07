const mongoose = require("mongoose");

const { Schema } = mongoose;

// ── User ─────────────────────────────────────────────────────────────────────

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["patient", "caregiver", "staff"],
      default: "patient",
    },

    fcmToken: {
      type: String,
    },

    dateOfBirth: {
      type: Date,
    },

    phone: {
      type: String,
    },

    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);


// ── Medication ───────────────────────────────────────────────────────────────

const medicationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    genericName: {
      type: String,
    },

    rxcui: {
      type: String,
    },

    dosage: {
      type: String,
      required: true,
    },

    form: {
      type: String,
    },

    prescribedBy: {
      type: String,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    totalQuantity: {
      type: Number,
    },

    remainingQuantity: {
      type: Number,
    },

    refillThreshold: {
      type: Number,
      default: 7,
    },

    instructions: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Medication = mongoose.model("Medication", medicationSchema);


// ── Schedule ─────────────────────────────────────────────────────────────────

const scheduleSchema = new Schema(
  {
    medicationId: {
      type: Schema.Types.ObjectId,
      ref: "Medication",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    frequency: {
      type: String,
      enum: [
        "daily",
        "twice_daily",
        "three_times_daily",
        "weekly",
        "as_needed",
        "custom",
      ],
      required: true,
    },

    times: {
      type: [String],
      default: [],
    },

    daysOfWeek: {
      type: [Number],
      default: [],
    },

    withFood: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Schedule = mongoose.model("Schedule", scheduleSchema);


// ── Adherence Log ────────────────────────────────────────────────────────────

const adherenceLogSchema = new Schema(
  {
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    medicationId: {
      type: Schema.Types.ObjectId,
      ref: "Medication",
      required: true,
    },

    scheduledTime: {
      type: Date,
      required: true,
    },

    takenAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["taken", "missed", "skipped", "pending"],
      default: "pending",
    },

    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const AdherenceLog = mongoose.model(
  "AdherenceLog",
  adherenceLogSchema
);


// ── Side Effect Report ───────────────────────────────────────────────────────

const sideEffectReportSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    medicationId: {
      type: Schema.Types.ObjectId,
      ref: "Medication",
    },

    symptoms: {
      type: [String],
      required: true,
    },

    severity: {
      type: String,
      enum: ["mild", "moderate", "severe"],
      required: true,
    },

    description: {
      type: String,
    },

    agentAnalysis: {
      type: Schema.Types.Mixed,
    },

    flaggedForReview: {
      type: Boolean,
      default: false,
    },

    escalated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const SideEffectReport = mongoose.model(
  "SideEffectReport",
  sideEffectReportSchema
);


// ── Interaction Alert ────────────────────────────────────────────────────────

const interactionAlertSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    medicationIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Medication",
        required: true,
      },
    ],

    severity: {
      type: String,
      enum: ["minor", "moderate", "major", "contraindicated"],
    },

    description: {
      type: String,
    },

    source: {
      type: String,
      enum: ["openfda", "agent"],
    },

    acknowledged: {
      type: Boolean,
      default: false,
    },

    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const InteractionAlert = mongoose.model(
  "InteractionAlert",
  interactionAlertSchema
);


// ── Refill Reminder ──────────────────────────────────────────────────────────

const refillReminderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    medicationId: {
      type: Schema.Types.ObjectId,
      ref: "Medication",
      required: true,
    },

    estimatedRunOutDate: {
      type: Date,
    },

    reminderSentAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["pending", "sent", "dismissed", "refilled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const RefillReminder = mongoose.model(
  "RefillReminder",
  refillReminderSchema
);

const CaregiverPatientSchema = new Schema({
  caregiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  patientId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  assignedAt:  { type: Date, default: Date.now },
  notes:       { type: String },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

const CaregiverPatient = mongoose.model("CaregiverPatient", CaregiverPatientSchema);

// ── Export Models ────────────────────────────────────────────────────────────

module.exports = {
  User,
  Medication,
  Schedule,
  AdherenceLog,
  SideEffectReport,
  InteractionAlert,
  RefillReminder,
  CaregiverPatient,
};

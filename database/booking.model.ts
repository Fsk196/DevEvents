import { Schema, model, models, Document, Types } from "mongoose";
import Event from "./event.model";

/**
 * TypeScript interface for Booking document
 */
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email: string) {
          // RFC 5322 compliant email validation regex
          const emailRegex =
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          return emailRegex.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
  },
  {
    timestamps: true, // Auto-generate createdAt and updatedAt
  }
);

/**
 * Pre-save hook: Validates that the referenced eventId exists in the database
 * Throws a validation error if the event does not exist
 */
(BookingSchema as any).pre(
  "save",
  async function (this: IBooking, next: (err?: Error) => void) {
    const booking = this;

    // Only validate eventId if it's new or modified
    if (booking.isModified("eventId") || booking.isNew) {
      try {
        const eventExists = await Event.findById(booking.eventId).select("_id");

        if (!eventExists) {
          const error = new Error(
            `Event with ID ${booking.eventId} does not exist`
          );
          error.name = "ValidationError";
          return next(error);
        }
      } catch (error) {
        const validationError = new Error(
          "Invalid event ID format or database error"
        );
        validationError.name = "ValidationError";
        return next(validationError);
      }
    }

    next();
  }
);

// Create index on eventId for faster queries when fetching bookings by event
BookingSchema.index({ eventId: 1 });

// Create compound index for common queries (e.g., fetching bookings by event and date)
BookingSchema.index({ eventId: 1, createdAt: -1 });

// Create index on email for user booking lookups
BookingSchema.index({ email: 1 });

// Enforce unique constraint: one booking per event per email
BookingSchema.index({ eventId: 1, email: 1 }, { unique: true });

const Booking = models.Booking || model<IBooking>("Booking", BookingSchema);

export default Booking;

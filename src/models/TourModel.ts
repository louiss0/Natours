import { Aggregate, model, Query, Schema, SchemaTypes, } from "mongoose";
import TourTypes from "../types/TourTypes";
import returnToObjectAndToJsonOptions from "../utils/returnToObjectAndToJsonOptions";
import slugify from "slugify"
import validator from "validator"

const tourSchemaOptions = returnToObjectAndToJsonOptions()


const tourSchema = new Schema({
    name: {
        type: String,
        required: [true, "A tour must have a name"],
        unique: true,
        maxlength: [40, "A tour must have less than or equal to 40 characters"],
        minlength: [10, "A tour must have more than or equal to 10 characters"],
        validate(val: string) {
            const value = val.split(" ").join("");
            return validator.isAlpha(value);
        },

    },
    slug: String,
    duration: {
        type: String,
        required: [true, "A tour must have a duration"],

    },
    maxGroupSize: {
        type: Number,
        required: [true, "A tour must have a max group size"],

    },
    difficulty: {
        type: String,
        required: [true, "A tour must have a difficulty"],
        enum: [
            TourTypes.TourDifficulties.Difficult,
            TourTypes.TourDifficulties.Medium,
            TourTypes.TourDifficulties.Easy
        ],

    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        max: 5,
        min: 1,
        set: (val: number) => Math.floor(Math.round(val))
    },
    price: {
        type: Number,
        required: [true, "A tour must have a price"],

    },
    imageCover: {
        type: String,
        required: [true, "A tour must have a cover image"],

    },
    priceDiscount: {
        type: Number,
        validate: {
            validator(this: TourTypes.TourDocument, val: number): boolean {
                return val < this.price
            },
            message: "Discount price should be below regular price"
        }
    },
    summary: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        required: [true, "A tour must have a description"],
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    images: [String],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: SchemaTypes.Mixed,
    locations: [
        SchemaTypes.Mixed,
    ],
    guides:
        [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
    startDates: [Date],
}, tourSchemaOptions)


tourSchema.virtual("durationWeeks")
    .get(function (this: TourTypes.TourDocument) {

        return this.duration / 7

    })

tourSchema.virtual("reviews", {
    ref: "Review",
    foreignField: "tour",
    localField: "_id"
})

tourSchema.index({ price: 1, ratingsAverage: -1 })
tourSchema.index({ slug: 1 })
tourSchema.index({ startLocation: "2dsphere" })



//  * Document Middleware
tourSchema.pre<TourTypes.TourDocument>("save", function (next) {

    this.slug = slugify(this.name, { lower: true })

    next(null)
})

//  * Query Middleware

tourSchema.pre<TourTypes.TourModel>(/^find/, function (next) {



    this.find({ secretTour: { $ne: true } })

    next(null)
})

tourSchema.pre(/^find/, function (next) {


    this.populate({ path: "guides", select: "-__v" })

    next(null)
})

tourSchema.pre<Aggregate<TourTypes.TourDocument>>("aggregate", function (next) {

    const things = this.pipeline()[0];
    if (Object.keys(things)[0] !== '$geoNear') {
        this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
    }

    next(null);
})


const Tour = model<TourTypes.TourDocument, TourTypes.TourModel>("Tour", tourSchema)


export default Tour
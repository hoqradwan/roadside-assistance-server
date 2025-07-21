import { model, Schema } from "mongoose";

const mechanicServiceRateSchema = new Schema({
    mechanic: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    services: [{
        service: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        price: {
            type: Number,
            required: true,
            default: 0
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    }
    ]
})

export const MechanicServiceRateModel = model("MechanicServiceRate", mechanicServiceRateSchema);
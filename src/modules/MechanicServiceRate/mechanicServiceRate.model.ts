import { model, Schema } from "mongoose";

const mechanicServiceRateSchema = new Schema({
    mechanic: {
        type: Schema.Types.ObjectId,
        ref: "Mechanic",
        required: true,
    },
    services :[{
        service : {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        price :{
            type: Number,
            required: true,
            default: 0
        },
       }
    ]
})

export const MechanicServiceRateModel = model("MechanicServiceRate", mechanicServiceRateSchema);
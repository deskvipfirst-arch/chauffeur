import Image from "next/image";
import { FaUsers, FaSuitcase, FaWifi, FaHandshake, FaClock, FaGlassCheers } from "react-icons/fa";

type VehicleServiceCardProps = {
  title: string;
  name: string;
  description: string;
  passengers: number;
  bags: number;
  wifi: boolean;
  meetGreet: boolean;
  drinks?: boolean;
  waitingTime: string;
  price: number;
  selected?: boolean;
  onSelect?: () => void;
};

const VehicleServiceCard = ({
  title,
  name,
  description,
  passengers,
  bags,
  wifi,
  meetGreet,
  drinks,
  waitingTime,
  price,
  selected = false,
  onSelect
}: VehicleServiceCardProps) => {
  return (
    <div 
      className={`flex flex-col md:flex-row bg-white p-4 border rounded-lg w-full mx-auto transition-all ${
        selected ? "border-primary border-2 bg-blue-50" : "border-gray-200"
      }`}
    >
      {/* Left Side: Car Image */}
      <div className="w-full md:w-1/3 flex-shrink-0">
        <Image
          src="/images/cars/ms1.jpg" // Same image for both cars in this example
          alt={name}
          width={400}
          height={250}
          className="object-cover w-full h-full rounded-lg"
        />
      </div>

      {/* Right Side: Details */}
      <div className="w-full flex-grow pl-0 md:pl-6 mt-4 md:mt-0">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-gray-600">{title}</h2>
            <h3 className="text-xl font-bold text-gray-800">{name}</h3>
          </div>
          <span className="text-2xl font-bold text-gray-800">£{price}</span>
        </div>

        <p className="text-gray-600 mt-2 text-justify">
          {description}
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center">
            <FaUsers className="mr-2 text-gray-700" size={18} />
            <span className="text-gray-700">{passengers} passengers</span>
          </div>
          <div className="flex items-center">
            <FaSuitcase className="mr-2 text-gray-700" size={18} />
            <span className="text-gray-700">{bags} {bags === 1 ? "bag" : "bags"}</span>
          </div>
          {wifi && (
            <div className="flex items-center">
              <FaWifi className="mr-2 text-gray-700" size={18} />
              <span className="text-gray-700">Free WiFi</span>
            </div>
          )}
          {meetGreet && (
            <div className="flex items-center">
              <FaHandshake className="mr-2 text-gray-700" size={18} />
              <span className="text-gray-700">Meet & Greet</span>
            </div>
          )}
          <div className="flex items-center">
            <FaClock className="mr-2 text-gray-700" size={18} />
            <span className="text-gray-700">{waitingTime} minutes free waiting time</span>
          </div>
          {drinks && (
            <div className="flex items-center">
              <FaGlassCheers className="mr-2 text-gray-700" size={18} />
              <span className="text-gray-700">Complimentary drinks</span>
            </div>
          )}
        </div>

        {/* Button */}
        <div className="flex justify-end mt-4">
          <button 
            onClick={onSelect}
            className={`font-semibold py-2 px-6 rounded transition ${
              selected 
                ? "bg-green-600 text-white hover:bg-green-700" 
                : "bg-yellow-500 text-white hover:bg-yellow-600"
            }`}
          >
            {selected ? "SELECTED" : "SELECT"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleServiceCard;
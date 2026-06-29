import React, { useContext } from 'react'
import { PiDotsSixVerticalBold } from 'react-icons/pi'
import { RxCross1 } from 'react-icons/rx'
import { Draggable } from 'react-beautiful-dnd'
import { ContextBudget } from '../../App'

export default function SourceRevenu(props) {
    const {
        revenus, setRevenus
    } = useContext(ContextBudget)

    const handleChangeName = (event) => {
        const revenus_ = revenus
        revenus_[props.index]["name"] = event.target.value
        setRevenus([...revenus_])
    }

    const handleChangeAmount = (event) => {
        const value = event.target.value;
        const amount = value === '' ? 0 : parseFloat(value); // prevents NaN

        const revenus_ = [...revenus]; // Create a copy of the revenus array
        revenus_[props.index]["amount"] = amount;
        setRevenus(revenus_);
    }

  return (
    <Draggable
        draggableId={props.id}
        index={props.index}
    >
        {
            (provided) => (
                <div className='flex flex-row justify-center items-center' {...provided.draggableProps} ref={provided.innerRef}>
                    <div className='cursor-grab' {...provided.dragHandleProps}>
                        <PiDotsSixVerticalBold />  
                    </div>
                    <div className='flex flex-row'>
                        <div className='mb-10 mr-10 ml-2'>
                            <label className="mb-2 text-sm font-medium text-gray-400">Nom</label>
                            <input value={props.name} onChange={handleChangeName} className="bg-black w-full border border-b-gray-800 border-x-transparent border-t-transparent text-white text-sm focus:ring-none focus:outline-none focus:border-b-[#f1c086] p-2.5" required></input>
                        </div>
                        <div className='mb-10 mx-10'>
                            <label className="mb-2 text-sm font-medium text-gray-400">Montant</label>
                            <input value={props.amount}  onChange={handleChangeAmount} className="bg-black w-full border border-b-gray-800 border-x-transparent border-t-transparent text-white text-sm focus:ring-none focus:outline-none focus:border-b-[#f1c086] p-2.5" required></input>
                        </div>
                    </div>
                    <div>
                        EUR
                    </div>
                </div>
            )
        }
    </Draggable>
  )
}

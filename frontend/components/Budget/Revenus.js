import React, { useContext, useRef, useEffect } from 'react'
import SourceRevenu from './SourceRevenu'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import { AiOutlinePlus } from 'react-icons/ai'
import { ContextBudget } from '../../App'

export default function Revenus() {
    const {
        revenus, setRevenus,
        sumRevenus, setSumRevenus,
    } = useContext(ContextBudget)

    useEffect(() => {
        let sum_ = 0
        revenus.forEach(revenu => {
            sum_ += parseFloat(revenu.amount)
        });
        setSumRevenus(sum_)
    }, [revenus])

    const handleAdd = () => {
        const nouveauRevenu = {
            "id": 'earning_' + Date.now().toString(),
            "name": '',
            "amount": 0
        }
        setRevenus([...revenus, nouveauRevenu])
    }

    return (
        <div className='w-2/3 flex flex-col rounded-xl bg-black border border-gray-800 mt-5'>
            <div className='flex flex-row justify-between border-b border-b-gray-800'>
                <div className='p-10'>Revenus</div>
                <div className='p-10 text-gray-400'>{sumRevenus} €</div>
            </div>

            <div className='p-10 text-gray-400'>
                <Droppable
                    droppableId='revenus'
                >
                    {
                        (provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                {
                                    revenus.map((revenu, index) => (
                                        <SourceRevenu id={revenu.id} index={index} name={revenu.name} amount={revenu.amount} key={revenu.id} />
                                    ))
                                }
                                {provided.placeholder}
                            </div>
                        )
                    }
                </Droppable>
                <div className='flex flex-row items-center cursor-pointer' onClick={handleAdd}>
                    <button className='mr-2'>Ajouter une source de revenu </button>
                    <AiOutlinePlus />
                </div>
            </div>
        </div>
    )
}

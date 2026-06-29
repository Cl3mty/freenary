import React, { useContext } from 'react'
import { FiPlay } from 'react-icons/fi'
import { BsPen } from 'react-icons/bs'
import { IoTrashBinOutline } from 'react-icons/io5'
import { ContextBudget } from '../../App'

import axios from 'axios';

export default function DiagramListItem({ selected, name, date, id }) {
  const {
    tauxEpargne, setTauxEpargne,
    tauxEpargnePossible, setTauxEpargnePossible,
    revenuTotal, setRevenuTotal,
    depensesTotales, setDepensesTotales,
    investissementsTotaux, setInvestissementsTotaux,
    reste, setReste,
    budgetDiagrams, setBudgetDiagrams,
    revenus, setRevenus,
    sumRevenus, setSumRevenus,
    sumDepenses, setSumDepenses,
    sumInvestissements, setSumInvestissements,
    investissements, setInvestissements,
    depenses, setDepenses,
    setIndexActiveDiagram,
    budgetData, setBudgetData
  } = useContext(ContextBudget)

  async function makeRequest() {
    return await axios.get('http://127.0.0.1:5000/budget/diagrams/delete', {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'withCredentials': false
      },
      params: {
        id: id,
      }
    })
  }

  async function fetchData() {
    return await axios.get('http://127.0.0.1:5000/budget/diagrams', {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'withCredentials': false
      }
    })
  }

  const deleteDiagram = (id) => {
    makeRequest().then((response) => {
      console.log('response: ', response)
      setIndexActiveDiagram(0)
      
      // refresh data
      fetchData().then((response) => {
        setBudgetDiagrams(response.data.budgetDiagrams)


        setIndexActiveDiagram(0)
          setRevenus([])
          setInvestissements({
            "categories": []
          })
          setDepenses({
            "categories": []
          })
          setTauxEpargne(0)
          setTauxEpargnePossible(0)
          setRevenuTotal(0)
          setSumRevenus(0)
          setDepensesTotales(0)
          setSumDepenses(0)
          setInvestissementsTotaux(0)
          setSumInvestissements(0)
          setReste(0)
          setBudgetData({
            "nodes": [],
            "links": []
          })
          setBudgetDiagrams({
            "diagrams": []
          })

        /* if (response.data.budgetDiagrams.length > 0) {
          setIndexActiveDiagram(0)
        } else {
          setIndexActiveDiagram(0)
          setRevenus([])
          setInvestissements({
            "categories": []
          })
          setDepenses({
            "categories": []
          })
          setTauxEpargne(0)
          setTauxEpargnePossible(0)
          setRevenuTotal(0)
          setSumRevenus(0)
          setDepensesTotales(0)
          setSumDepenses(0)
          setInvestissementsTotaux(0)
          setSumInvestissements(0)
          setReste(0)
          setBudgetData({
            "nodes": [],
            "links": []
          })
          setBudgetDiagrams({
            "diagrams": []
          })
        } */

      })
    })

  }


  return (
    <div className={`flex flex-row justify-between py-5 border-b border-gray-800 cursor-pointer`}>
      <div className={`${selected ? 'text-[#f1c086]' : 'text-white'} flex-1`}>
        {name}
      </div>
      <div className={`${selected ? 'text-[#f1c086]' : 'text-white'} flex-1`}>
        {date}
      </div>
      {
        selected ?
          <div className='flex flex-row justify-evenly w-2/12'>
            {/* <BsPen className='m-1 cursor-pointer' onClick={() => console.log('rename', id)} /> */}
            <IoTrashBinOutline className='m-1 cursor-pointer text-red' onClick={() => deleteDiagram(id)} />
          </div> :
          <div className='flex flex-row justify-evenly w-2/12'>
            {/* <BsPen className='m-1 text-gray-800 disabled' /> */}
            <IoTrashBinOutline className='m-1 text-gray-800 disabled' />
          </div>
      }
    </div>
  );
}
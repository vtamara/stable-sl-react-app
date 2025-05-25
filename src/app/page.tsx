'use client'

import axios from 'axios'
import {ArrowLeft, RefreshCw} from "lucide-react"
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWeb3 } from "@/contexts/useWeb3";

export default function Home() {
  const {
    address,
    getShortAddress,
    getUserAddress,
    sendCUSD,
    mintMinipayNFT,
    getNFTs,
    signTransaction,
  } = useWeb3();

  const [quoteToken, setQuoteToken] = useState("")
  const [quoteTimestamp, setQuoteTimestamp] = useState(0)
  const [quoteUsdPriceInSle, setQuoteUsdPriceInSle] = useState(0.0)
  const [quoteMinimum, setQuoteMinimum] = useState(0)
  const [quoteMaximum, setQuoteMaximum] = useState(0)
  const [step, setStep] = useState(1)
  const [amountSle, setAmountSle] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [amountUsd, setAmountUsd] = useState(0.0)
  const [countdown, setCountdown] = useState(0)
  const [secondsWaitingPayment, setSecondsWaitingPayment] = useState(0)
  const [receiverPhone, setReceiverPhone] = useState("")
  const [receiverName, setReceiverName] = useState("")
  const [transactionUrl, setTransactionUrl] = useState("")

  useEffect(() => {
    getUserAddress()
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
        if (step == 4) {
          setSecondsWaitingPayment(secondsWaitingPayment - 1)
          if (secondsWaitingPayment <= 0) {
            setStep(6)
          }
        }
      }, 1000)
      return () => clearTimeout(timer) // Cleanup on unmount
    } else {
      // Reset the timer after a short delay
      switch (step) {
        case 1:
        case 2:
        case 3:
          setTimeout(() => {
            fetchPurchaseQuote()
            setCountdown(10)
          }, 1000) // 1 second delay
          break
        case 4:
          setTimeout(() => {
            fetchOrderState()
            setCountdown(10)
          }, 1000) // 1 second delay
          break
        default:
          break
      }
    }
  }, [countdown])


  const runningDevelopment = () => process.env.NEXT_PUBLIC_NETWORK == "ALFAJORES"
  
  const runningProduction = () => process.env.NEXT_PUBLIC_NETWORK == "CELO"

  const isAlfajores = () => (typeof ethereum != "undefined") &&
    ethereum.networkVersion === '44787'

  const isCelo= () => (typeof ethereum != "undefined") &&
    ethereum.networkVersion === '42220'

  const fetchPurchaseQuote = async () => {
    try {
     if (address && phoneNumber && buyerName) {
       let tokenParam = quoteToken == "" ? "" : `token=${quoteToken}&`
       const apiPurchaseQuoteUrl = process.env.NEXT_PUBLIC_COORDINATOR +
        `/api/purchase_quote?${tokenParam}wallet=${address}&phone=${phoneNumber}&buyerName=${buyerName}`
        axios.get(apiPurchaseQuoteUrl)
        .then(response => {
          if (response.data) {
            let data = response.data
            if (data.token!== undefined &&
              data.timestamp !== undefined &&
              data.usdPriceInSle !== undefined &&
              data.minimum !== undefined &&
              data.maximum !== undefined
            ) {
              setQuoteToken(data.token)
              setQuoteTimestamp(data.timestamp)
              setQuoteUsdPriceInSle(data.usdPriceInSle)
              setQuoteMinimum(data.minimum)
              setQuoteMaximum(data.maximum)

              if (amountSle && parseFloat(amountSle)>0) {
                setAmountUsd(
                  calculateAmountUsd(parseFloat(amountSle), data.usdPriceInSle)
                )
              }
            } else {
              console.error('Invalid data format from API:', data)
            }
          }
        })
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
    }
  }


  const calculateAmountUsd = (sle: number, slePerUsd: number) => {
    return slePerUsd && slePerUsd > 0 && sle && sle > 0 ?
      Math.round(sle*100.0/slePerUsd)/100.0 : 0
  }

  const secondsAsMinutes = (seconds: number):String => {
    return `${Math.floor(seconds / 60)}:${seconds % 60}`
  }

  const handleNext = () => {
    switch (step) {
      case 1:
        if (!phoneNumber || !/^0\d{8}$/.test(phoneNumber)) {
          alert('Phone number should have 9 digits and start with 0')
        } else if (runningProduction() && !isCelo()) {
          alert('Switch to the Celo Blockchain')
        } else if (!address) {
          alert('Please connect your wallet')
        } else if (!buyerName) {
          alert('Please provide name linked to Orange Money')
        } else {
          fetchPurchaseQuote()
          setStep(2)
        }
      break
      case 2:
        if (+amountSle < quoteMinimum) {
          alert('Amount should be greather than lower limit')
        } else if (runningProduction() && !isCelo()) {
          alert('Switch to the Celo Blockchain')
        } else if (+quoteMaximum == 0) {
          alert('Seems there is a problem with the backend, try again later')
        } else if (+amountSle > quoteMaximum) {
          alert('Amount should be less than upper limit')
        } else if (amountSle && parseFloat(amountSle) > 0) {
          setStep(3)
        } else {
          alert('Please enter valid values.')
        }
        break
      default:
        alert('Please enter valid values.')
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const copyTestPhone = async () => {
    try {
      const inputField = document.getElementById('testPhone') as HTMLInputElement;
      await navigator.clipboard.writeText(inputField.value);
      console.log('Text copied to clipboard successfully!');
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }

  const handleConfirm = () => {
    try {
      if (runningProduction() && !isCelo()) {
          alert('Switch to the Celo Blockchain')
          return 
      }
 
      const apiPurchaseOrderUrl = process.env.NEXT_PUBLIC_COORDINATOR +
        `/api/purchase_order?token=${quoteToken}&amountSle=${amountSle}`
      axios.get(apiPurchaseOrderUrl)
      .then(response => {
        if (response.data) {
          let data = response.data
          if (data.token !== undefined &&
            data.seconds !== undefined &&
            data.amountSle !== undefined &&
            data.amountUsd !== undefined &&
            data.receiverPhone !== undefined &&
            data.receiverName !== undefined
           ) {
             /* TODO: if (data.token !== token ||
                 data.amountSle !== amountSle ||
                   data.amountUsd !== amountUsd) {
               alert("Mismatch in information of this app and coordinator")
             } else { */
             setSecondsWaitingPayment(data.seconds)
             setReceiverPhone(data.receiverPhone)
             setReceiverName(data.receiverName)
             setStep(4)
           }
           else {
            alert('Incorrect information to make order. ' + JSON.stringify(data))
           }
        } else {
          alert("No reponse data");
        }
      }).catch(function (error) {
        alert("Problem with axios" + error);
      });
    } catch (error) {
     alert('Error making order:' + error)
    }
  }

  const handleSupposePaid = () => {
    let e = document.getElementById('suppose-I-paid')
    if (e) {
      e.setAttribute("disabled", "true");
    }
    try {
      let msg= `Transaction Id AB0123CD.45EF Transfer Succesful from ${phoneNumber} transaction amount SLE${amountSle} net credit amount SLE${amountSle} your new balance is SLE500`

      const apiSmsReceivedUrl = process.env.NEXT_PUBLIC_COORDINATOR +
        `/api/sms_received`

      axios.post(apiSmsReceivedUrl, { 
        sender: phoneNumber, 
        msg: msg 
      }/*, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        // Trying to avoid prefligth OPTIONS request
      }*/)
      .then(function (response) {
        if (response.data) {
          let data = response.data
          alert(`Sent, answer from coordinator: ${JSON.stringify(data)}`)
        } else {
          alert('No data in response')
        }
      })
      .catch(error => {
         alert(`Problem sending: ${error}`)
      })
    } catch (error) {
      alert('Error supposing payment:' + error)
    }

  }


  const handleReceipt = () => {

  }

  const fetchOrderState = async () => {
    try {
     if (quoteToken) {
       const apiPurchaseOrderStateUrl= process.env.NEXT_PUBLIC_COORDINATOR +
        `/api/purchase_order_state?token=${quoteToken}`
        axios.get(apiPurchaseOrderStateUrl)
        .then(response => {
          if (response.data) {
            let data = response.data
            if (data.state !== undefined) {
              switch (data.state) {
               case "pending":
                 break
               case "expired":
                 setStep(6)
                 break
               case "paid":
                 setTransactionUrl(data.transactionUrl)
                 setStep(5)
              }
            } else {
              alert("Response from coordinator service doesn't include state")
            }
          } else {
              alert("No response from coordinator service")
          }
        })
      }
    } catch (error) {
      console.error('Error fetching status from coordinator service:', error)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <Card className="w-full max-w-md p-4 rounded-lg shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Stable-SL</CardTitle>
          <CardDescription>
            <p>Buy USDT in Sierra Leone</p>
            <p>Step {step} of 5</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-2">
              {address && runningDevelopment() &&
                <p className="text-sm">
                  Your wallet address: {getShortAddress()}
                </p>
              }
              <label htmlFor="phoneNumber" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Phone Number with Orange Money
              {runningDevelopment() &&
                <div className="flex items-center text-sm">
                  Test with &nbsp;
                  <div className="bg-gray-50">
                    012456789 &nbsp;
                    <Input style={{display: "none"}} id="testPhone" value="012345678" disabled />
                    <Button
                      className="btn btn-sm bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={copyTestPhone}>Copy</Button>
                   </div>
                </div>
              }
              </label>
              <Input
                id="phoneNumber"
                type="tel"
                maxLength={14}
                placeholder="Sierra Leone number e.g 075934442"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                aria-label="Phone Number"
              />
              <label htmlFor="buyerName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Name linked to Orange Money
              </label>
               <Input
                id="buyerName"
                value={buyerName}
                maxLength={80}
                onChange={(e) => setBuyerName(e.target.value)}
                aria-label="Name linked to Orange Money"
              />

              {!address &&
                <p>Please connect your wallet</p>
              }
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <label htmlFor="amountSle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Amount of SLE to pay</label>
              <Input
                id="amountSle"
                type="number"
                placeholder="Enter amount"
                value={amountSle}
                min={quoteMinimum}
                max={quoteMaximum}
                onChange={(e) => {
                  setAmountSle(e.target.value)
                  setAmountUsd(
                    calculateAmountUsd(parseFloat(e.target.value),
                                       quoteUsdPriceInSle)
                  )
                } }
                aria-label="Amount of SLE"
              />
              <p className="text-sm text-gray-500">
                Amount of USD to receive: {amountUsd} USD
              </p>
              <p className="text-sm text-gray-500">
                Price of one USD: {quoteUsdPriceInSle} SLE
              </p>
              <p className="text-sm text-gray-500">
                Order limits in SLE: {quoteMinimum} - {quoteMaximum}
              </p>
              <div className="flex text-sm text-gray-500">
                <span>Seconds to update:&nbsp; </span>
                  {countdown == 10 && (<span>{countdown}</span>)}
                  {countdown > 0 && countdown < 10 && (<span>&nbsp;{countdown}</span>)}
                  { countdown == 0 &&
                    <span className="">
                      <RefreshCw className="animate-spin size-4 text-primary"/>
                    </span>
                  }
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <p className="text-2xl">Please confirm the details below:</p>
              <p className="text-sm">Phone Number with Orange Money: {phoneNumber}</p>
              <p className="text-sm">Amount in SLE to spend: SLE${amountSle}</p>
              <p className="text-sm">Amount of USD to receive: US${amountUsd}</p>
              <p className="text-sm">Amount within limits: {+amountSle >= quoteMinimum &&
                +amountSle <= quoteMaximum ? "Yes" : "No -- please go back"}</p>
              {runningDevelopment() &&
                <div>
                  <p className="text-sm">Timestamp of quote: {quoteTimestamp}</p>
                  <p className="text-sm">Your wallet address: {getShortAddress()}</p>
                </div>
              }
            </div>
          )}

          {step == 4 &&
            <div className="space-y-2">
              <p className="text-sm">Waiting for your payment: {secondsAsMinutes(secondsWaitingPayment)}</p>
              <p className="text-sm">From your phone {phoneNumber} ({buyerName}) with Orange Money, pay {amountSle}SLE to the phone {receiverPhone} ({receiverName})</p>
            </div>
          }
          {step == 5 &&
            <div className="space-y-2">
              <p className="text-sm">Thanks for your payment. We transfered {amountUsd}USD to your wallet.</p>
            </div>
          }
          {step == 5 && runningDevelopment() &&
            <div className="space-y-2">
              <p className="text-sm">(Well in reality since this is testnet we sent 0.1USDC...)</p>
            </div>
          }

          {step == 6 &&
            <div className="space-y-2">
              <p className="text-sm">stable-sl didn't receive your payment. Order cancelled</p>
              <p className="text-sm">If you need support please in Telegram write to <a href="https://t.me/soporte_pdJ_bot" target="_blank">@soporte_pdJ_bot</a>.</p>
            </div>
          }


          <div className={`flex ${step > 1 ? 'justify-between' : 'justify-end'}` }>
            {step > 1 && step <= 3 && (
              <Button variant="outline" onClick={handleBack} className="mr-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {step < 3 &&
              <Button onClick={handleNext} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Next
              </Button>
            }
            { step == 3 &&
              <Button onClick={handleConfirm} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <span>Confirm (</span>
                  { countdown > 0 && (<span>{countdown}</span>)}
                  { countdown == 0 &&
                    <span><RefreshCw className="animate-spin size-4 text-primary"/></span>
                  }
                  <span>)</span>
              </Button>
            }
            { step == 4 && runningDevelopment() &&
              <Button id="suppose-I-paid" onClick={handleSupposePaid} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Suppose I paid
              </Button>
            }

            { step == 5 &&
              <a className="bg-primary text-primary-foreground hover:bg-primary/90 btn btn-sm" href={transactionUrl} target="_blank">Transaction Receipt</a>
            }

          </div>
          <div>
            <p className="text-sm">For support contact <a href="https://t.me/soporte_pdJ_bot" target="_blank">@soporte_pdJ_bot</a> in Telegram.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
